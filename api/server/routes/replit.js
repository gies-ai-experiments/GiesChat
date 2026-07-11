const express = require('express');
const { CacheKeys } = require('librechat-data-provider');
const { checkBuildStatus, checkLimit } = require('@librechat/api');
const { logger } = require('@librechat/data-schemas');
const { getMCPManager, getFlowStateManager } = require('~/config');
const requireJwtAuth = require('~/server/middleware/requireJwtAuth');
const { findToken, createToken, updateToken, deleteTokens } = require('~/models');
const { getLogStores } = require('~/cache');

const STATUS_LIMIT = { max: 8, windowMs: 60_000 };

const router = express.Router();
router.use(requireJwtAuth);

router.get('/build-status', async (req, res) => {
  try {
    if (!checkLimit(`${req.user.id}:replit-status`, STATUS_LIMIT.max, STATUS_LIMIT.windowMs)) {
      return res.status(429).json({ status: 'error', detail: 'rate_limited' });
    }

    const replId = typeof req.query.replId === 'string' ? req.query.replId : '';
    const mcpManager = getMCPManager();
    const flowManager = getFlowStateManager(getLogStores(CacheKeys.FLOWS));
    const callTool = async (toolName, args) => {
      const [text] = await mcpManager.callTool({
        serverName: 'replit',
        toolName,
        provider: 'openai',
        toolArguments: args,
        user: req.user,
        flowManager,
        tokenMethods: { findToken, createToken, updateToken, deleteTokens },
      });
      return typeof text === 'string' ? text : JSON.stringify(text);
    };

    const result = await checkBuildStatus({ callTool, replId });
    return res.json(result);
  } catch (error) {
    logger.error('[replit] build-status failed', error);
    return res.json({ status: 'error', detail: 'internal' });
  }
});

module.exports = router;
