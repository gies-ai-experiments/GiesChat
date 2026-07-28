import type { FilterQuery, Model, PipelineStage } from 'mongoose';
import type { IConversation, IMessage } from '~/types';

/** Per-agent activity totals. Only agents with activity in the window are returned. */
export interface AgentUsageRow {
  agentId: string;
  conversationCount: number;
  userCount: number;
  messageCount: number;
  lastActivity: Date | null;
}

/** Per-student activity totals. Only students with activity in the window are returned. */
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

export interface UsageMethods {
  aggregateAgentUsage(scope: AgentUsageScope): Promise<AgentUsageRow[]>;
  aggregateStudentUsage(scope: StudentUsageScope): Promise<StudentUsageRow[]>;
}

/**
 * Messages authored by the student, not the assistant's replies: a reply is a
 * mechanical consequence of a prompt, so counting both only doubles the number
 * without adding signal about effort.
 */
const MESSAGE_COUNT = { $ifNull: [{ $arrayElemAt: ['$activity.count', 0] }, 0] };

/** Falls back to the conversation itself, which the `since` match already bounds. */
const LAST_ACTIVITY = { $ifNull: [{ $arrayElemAt: ['$activity.last', 0] }, '$updatedAt'] };

export function createUsageMethods(mongoose: typeof import('mongoose')): UsageMethods {
  /**
   * Matched conversations joined to their in-window student messages. One
   * round trip: the join runs inside the server, never per agent or per student.
   */
  function scopedActivityStages(
    agentFilter: FilterQuery<IConversation>,
    userIds: string[] | null,
    since: Date,
  ): PipelineStage[] {
    const match: FilterQuery<IConversation> = {
      ...agentFilter,
      isTemporary: { $ne: true },
      updatedAt: { $gte: since },
    };
    if (userIds !== null) {
      match.user = { $in: userIds };
    }

    /**
     * `$lookup` joins on a physical collection name, so the raw name is the only
     * thing that can be passed here. Reading it off the model keeps a renamed
     * collection from silently breaking the join. The join itself is outside
     * Mongoose middleware by construction, so it carries its own tenant
     * predicate: `conversationId` + `user` is unique only *per tenant*, which
     * makes the join key alone a UUID-collision bet rather than a boundary.
     * `tenantId` is optional on both schemas, so a message written before
     * tenancy inherits its conversation's tenant instead of being dropped.
     */
    // eslint-disable-next-line no-restricted-syntax
    const messageCollection = (mongoose.models.Message as Model<IMessage>).collection.name;

    return [
      { $match: match },
      {
        $lookup: {
          from: messageCollection,
          let: {
            conversationId: '$conversationId',
            user: '$user',
            tenantId: '$tenantId',
          },
          pipeline: [
            {
              $match: {
                isCreatedByUser: true,
                createdAt: { $gte: since },
                $expr: {
                  $and: [
                    { $eq: ['$conversationId', '$$conversationId'] },
                    { $eq: ['$user', '$$user'] },
                    { $eq: [{ $ifNull: ['$tenantId', '$$tenantId'] }, '$$tenantId'] },
                  ],
                },
              },
            },
            { $group: { _id: null, count: { $sum: 1 }, last: { $max: '$createdAt' } } },
          ],
          as: 'activity',
        },
      },
    ];
  }

  async function aggregateAgentUsage({
    agentIds,
    userIds,
    since,
  }: AgentUsageScope): Promise<AgentUsageRow[]> {
    if (agentIds.length === 0 || userIds?.length === 0) {
      return [];
    }

    const Conversation = mongoose.models.Conversation as Model<IConversation>;
    return Conversation.aggregate<AgentUsageRow>([
      ...scopedActivityStages({ agent_id: { $in: agentIds } }, userIds, since),
      {
        $group: {
          _id: '$agent_id',
          conversationCount: { $sum: 1 },
          users: { $addToSet: '$user' },
          messageCount: { $sum: MESSAGE_COUNT },
          lastActivity: { $max: LAST_ACTIVITY },
        },
      },
      {
        $project: {
          _id: 0,
          agentId: '$_id',
          conversationCount: 1,
          userCount: { $size: '$users' },
          messageCount: 1,
          lastActivity: 1,
        },
      },
    ]);
  }

  async function aggregateStudentUsage({
    agentId,
    userIds,
    since,
  }: StudentUsageScope): Promise<StudentUsageRow[]> {
    if (userIds?.length === 0) {
      return [];
    }

    const Conversation = mongoose.models.Conversation as Model<IConversation>;
    return Conversation.aggregate<StudentUsageRow>([
      ...scopedActivityStages({ agent_id: agentId }, userIds, since),
      {
        $group: {
          _id: '$user',
          conversationCount: { $sum: 1 },
          messageCount: { $sum: MESSAGE_COUNT },
          lastActivity: { $max: LAST_ACTIVITY },
        },
      },
      {
        $project: {
          _id: 0,
          userId: '$_id',
          conversationCount: 1,
          messageCount: 1,
          lastActivity: 1,
        },
      },
    ]);
  }

  return { aggregateAgentUsage, aggregateStudentUsage };
}
