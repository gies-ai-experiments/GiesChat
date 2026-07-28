import { ResourceType, PermissionBits } from 'librechat-data-provider';
import { logger, isValidObjectIdString } from '@librechat/data-schemas';
import type { IUser, IAgent, IGroup } from '@librechat/data-schemas';
import type { FilterQuery, Types } from 'mongoose';
import type { Response } from 'express';
import type { ServerRequest } from '~/types/http';

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_DAYS = 30;
const MIN_DAYS = 1;
const MAX_DAYS = 365;

const AGENT_SCOPE_FIELDS = '_id id name author';
const STUDENT_FIELDS = '_id name email';

/** Per-agent activity totals for the entities that actually have activity. */
export interface AgentUsageRow {
  agentId: string;
  conversationCount: number;
  userCount: number;
  messageCount: number;
  lastActivity: Date | null;
}

/** Per-student activity totals for the entities that actually have activity. */
export interface StudentUsageRow {
  userId: string;
  conversationCount: number;
  messageCount: number;
  lastActivity: Date | null;
}

export interface AgentUsageScope {
  agentIds: string[];
  /** `null` means every user; `[]` means no user (an empty group). */
  userIds: string[] | null;
  since: Date;
}

export interface StudentUsageScope {
  agentId: string;
  /** `null` means every user; `[]` means no user (an empty group). */
  userIds: string[] | null;
  since: Date;
}

export interface AdminUsageDeps {
  findAgents: (
    filter: FilterQuery<IAgent>,
    fieldsToSelect?: string | string[] | null,
  ) => Promise<IAgent[]>;
  findAccessibleResources: (params: {
    userId: string;
    role?: string | null;
    resourceType: string;
    requiredPermissions: number;
  }) => Promise<Types.ObjectId[]>;
  findGroupById: (groupId: string, projection?: Record<string, 0 | 1>) => Promise<IGroup | null>;
  findUsers: (
    searchCriteria: FilterQuery<IUser>,
    fieldsToSelect?: string | string[] | null,
  ) => Promise<IUser[]>;
  aggregateAgentUsage: (scope: AgentUsageScope) => Promise<AgentUsageRow[]>;
  aggregateStudentUsage: (scope: StudentUsageScope) => Promise<StudentUsageRow[]>;
}

interface AgentUsageItem {
  agent_id: string;
  name: string;
  conversationCount: number;
  userCount: number;
  messageCount: number;
  lastActivity: string | null;
}

interface StudentUsageItem {
  userId: string;
  name: string;
  email: string;
  conversationCount: number;
  messageCount: number;
  lastActivity: string | null;
}

interface MemberScope {
  /** `false` when a groupId was supplied but names no group — malformed or nonexistent. */
  found: boolean;
  userIds: string[] | null;
  /** Display fields for the resolved members; `null` when no group narrowed the scope. */
  users: Map<string, IUser> | null;
}

interface AgentUsageParams {
  agent_id?: unknown;
}

/** Untrusted query values are anything `qs` can produce, so only plain strings are honoured. */
function resolveSince(raw: unknown): Date {
  const days = typeof raw === 'string' ? parseInt(raw, 10) : Number.NaN;
  const effective = Number.isNaN(days)
    ? DEFAULT_DAYS
    : Math.min(Math.max(days, MIN_DAYS), MAX_DAYS);
  return new Date(Date.now() - effective * DAY_MS);
}

function byUsageThenName<T extends { conversationCount: number; name: string }>(
  a: T,
  b: T,
): number {
  return b.conversationCount - a.conversationCount || a.name.localeCompare(b.name);
}

export function createAdminUsageHandlers(deps: AdminUsageDeps): {
  listAgentUsage: (req: ServerRequest, res: Response) => Promise<Response>;
  listAgentStudentUsage: (req: ServerRequest, res: Response) => Promise<Response>;
} {
  const {
    findAgents,
    findAccessibleResources,
    findGroupById,
    findUsers,
    aggregateAgentUsage,
    aggregateStudentUsage,
  } = deps;

  /**
   * The security boundary: an agent is in scope only when the caller authored it
   * or holds an EDIT grant on it. Narrowing by `agentId` keeps the same boundary.
   */
  async function findScopedAgents(user: IUser, agentId?: string): Promise<IAgent[]> {
    const callerId = String(user._id);
    const editableIds = await findAccessibleResources({
      userId: callerId,
      role: user.role,
      resourceType: ResourceType.AGENT,
      requiredPermissions: PermissionBits.EDIT,
    });
    const scope: FilterQuery<IAgent> = {
      $or: [{ author: callerId }, { _id: { $in: editableIds } }],
    };
    return findAgents(
      agentId === undefined ? scope : { id: agentId, ...scope },
      AGENT_SCOPE_FIELDS,
    );
  }

  /**
   * `memberIds` holds `idOnTheSource` (an Entra GUID for every SSO user), not user
   * ObjectIds, while conversations and messages key on the mongo `_id`. Resolving
   * here is what keeps a class filter from matching zero activity. A member that
   * resolves to no user keeps its raw id so it still appears as a zero row rather
   * than silently vanishing from the roster.
   */
  async function resolveMemberScope(groupId: string | undefined): Promise<MemberScope> {
    if (groupId === undefined) {
      return { found: true, userIds: null, users: null };
    }
    /** A malformed id would make `findGroupById` throw a CastError and surface as a 500. */
    if (!isValidObjectIdString(groupId)) {
      return { found: false, userIds: null, users: null };
    }
    const group = await findGroupById(groupId, { memberIds: 1 });
    if (!group) {
      return { found: false, userIds: null, users: null };
    }

    const memberIds = Array.from(new Set(group.memberIds ?? []));
    if (memberIds.length === 0) {
      return { found: true, userIds: [], users: new Map<string, IUser>() };
    }

    const objectIds = memberIds.filter(isValidObjectIdString);
    const conditions: FilterQuery<IUser>[] = [{ idOnTheSource: { $in: memberIds } }];
    if (objectIds.length > 0) {
      conditions.push({ _id: { $in: objectIds } });
    }
    const members = await findUsers({ $or: conditions }, `${STUDENT_FIELDS} idOnTheSource`);

    const byMemberId = new Map<string, IUser>();
    for (const member of members) {
      if (member.idOnTheSource) {
        byMemberId.set(member.idOnTheSource, member);
      }
      byMemberId.set(String(member._id), member);
    }

    const users = new Map<string, IUser>();
    const seen = new Set<string>();
    const userIds: string[] = [];
    for (const memberId of memberIds) {
      const member = byMemberId.get(memberId);
      const userId = member === undefined ? memberId : String(member._id);
      if (seen.has(userId)) {
        continue;
      }
      seen.add(userId);
      userIds.push(userId);
      if (member !== undefined) {
        users.set(userId, member);
      }
    }

    return { found: true, userIds, users };
  }

  /** Resolves display fields for ids that are native user ObjectIds; others stay unresolved. */
  async function resolveUsers(userIds: string[]): Promise<Map<string, IUser>> {
    const lookupIds = userIds.filter(isValidObjectIdString);
    if (lookupIds.length === 0) {
      return new Map<string, IUser>();
    }
    const users = await findUsers({ _id: { $in: lookupIds } }, STUDENT_FIELDS);
    return new Map(users.map((user) => [String(user._id), user]));
  }

  async function listAgentUsageHandler(req: ServerRequest, res: Response) {
    if (!req.user?._id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const rawGroupId = req.query.groupId;
    if (rawGroupId !== undefined && typeof rawGroupId !== 'string') {
      return res.status(400).json({ error: 'groupId must be a string' });
    }

    const since = resolveSince(req.query.days);

    try {
      const scope = await resolveMemberScope(rawGroupId);
      if (!scope.found) {
        return res.status(404).json({ error: 'Group not found' });
      }

      const agents = await findScopedAgents(req.user);
      const usage = await aggregateAgentUsage({
        agentIds: agents.map((agent) => agent.id),
        userIds: scope.userIds,
        since,
      });
      const usageByAgent = new Map(usage.map((row) => [row.agentId, row]));

      const items: AgentUsageItem[] = agents.map((agent) => {
        const row = usageByAgent.get(agent.id);
        return {
          agent_id: agent.id,
          name: agent.name ?? '',
          conversationCount: row?.conversationCount ?? 0,
          userCount: row?.userCount ?? 0,
          messageCount: row?.messageCount ?? 0,
          lastActivity: row?.lastActivity?.toISOString() ?? null,
        };
      });
      items.sort(byUsageThenName);

      return res.status(200).json({ agents: items });
    } catch (error) {
      logger.error('[adminUsage] listAgentUsage error:', error);
      return res.status(500).json({ error: 'Failed to list agent usage' });
    }
  }

  async function listAgentStudentUsageHandler(req: ServerRequest, res: Response) {
    if (!req.user?._id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { agent_id: rawAgentId } = req.params as AgentUsageParams;
    if (typeof rawAgentId !== 'string' || rawAgentId === '') {
      return res.status(400).json({ error: 'agent_id must be a string' });
    }

    const rawGroupId = req.query.groupId;
    if (rawGroupId !== undefined && typeof rawGroupId !== 'string') {
      return res.status(400).json({ error: 'groupId must be a string' });
    }

    const since = resolveSince(req.query.days);

    try {
      const [agent] = await findScopedAgents(req.user, rawAgentId);
      if (!agent) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const scope = await resolveMemberScope(rawGroupId);
      if (!scope.found) {
        return res.status(404).json({ error: 'Group not found' });
      }

      const usage = await aggregateStudentUsage({
        agentId: rawAgentId,
        userIds: scope.userIds,
        since,
      });
      const usageByUser = new Map(usage.map((row) => [row.userId, row]));

      /** With a group, every member is listed — non-participation is the signal faculty want. */
      const userIds = scope.userIds ?? usage.map((row) => row.userId);
      /** The group path already resolved its members; re-reading them would be a second round trip. */
      const usersById = scope.users ?? (await resolveUsers(userIds));

      const items: StudentUsageItem[] = userIds.map((userId) => {
        const row = usageByUser.get(userId);
        const user = usersById.get(userId);
        return {
          userId,
          name: user?.name ?? '',
          email: user?.email ?? '',
          conversationCount: row?.conversationCount ?? 0,
          messageCount: row?.messageCount ?? 0,
          lastActivity: row?.lastActivity?.toISOString() ?? null,
        };
      });
      items.sort(byUsageThenName);

      return res.status(200).json({ agent_id: rawAgentId, students: items });
    } catch (error) {
      logger.error('[adminUsage] listAgentStudentUsage error:', error);
      return res.status(500).json({ error: 'Failed to list student usage' });
    }
  }

  return {
    listAgentUsage: listAgentUsageHandler,
    listAgentStudentUsage: listAgentStudentUsageHandler,
  };
}
