const express = require('express');
const { createAdminUsageHandlers } = require('@librechat/api');
const { SystemCapabilities } = require('@librechat/data-schemas');
const { requireCapability } = require('~/server/middleware/roles/capabilities');
const { findAccessibleResources } = require('~/server/services/PermissionService');
const { requireJwtAuth } = require('~/server/middleware');
const db = require('~/models');

const router = express.Router();

const requireAdminAccess = requireCapability(SystemCapabilities.ACCESS_ADMIN);
const requireReadUsage = requireCapability(SystemCapabilities.READ_USAGE);
const requireReadGroups = requireCapability(SystemCapabilities.READ_GROUPS);

const handlers = createAdminUsageHandlers({
  findAgents: db.getAgents,
  /**
   * The service wrapper, not `db.findAccessibleResources`: the db method takes a
   * positional principals list, while the handler passes `{ userId, role, ... }`.
   * The service resolves the caller's full principal set (user + groups + role +
   * public) first, so agents shared with a professor via a group stay in scope.
   */
  findAccessibleResources,
  findGroupById: db.findGroupById,
  findUsers: db.findUsers,
  aggregateAgentUsage: db.aggregateAgentUsage,
  aggregateStudentUsage: db.aggregateStudentUsage,
});

router.use(requireJwtAuth, requireAdminAccess);

/**
 * Both routes read class rosters: `/agents/:agent_id/students` returns the name
 * and email of every group member, and `/agents` filters *by* a roster while
 * distinguishing a real group (200) from a nonexistent one (404), which makes
 * group ids enumerable. `read:groups` is the established boundary for roster
 * data and is required alongside `read:usage` on both, otherwise usage access
 * alone would enumerate or read another instructor's roster.
 */
router.get('/agents', requireReadUsage, requireReadGroups, handlers.listAgentUsage);
router.get(
  '/agents/:agent_id/students',
  requireReadUsage,
  requireReadGroups,
  handlers.listAgentStudentUsage,
);

module.exports = router;
