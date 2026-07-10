const express = require('express');
const { canSubmitIssue, submitIssue } = require('@librechat/api');
const { logger } = require('@librechat/data-schemas');
const requireJwtAuth = require('~/server/middleware/requireJwtAuth');

const router = express.Router();
router.use(requireJwtAuth);

router.post('/', async (req, res) => {
  const description = typeof req.body?.description === 'string' ? req.body.description.trim() : '';
  if (description.length < 10 || description.length > 2000) {
    return res.status(400).json({ error: 'invalid_description' });
  }
  if (!canSubmitIssue(req.user.id)) {
    return res.status(429).json({ error: 'rate_limited' });
  }
  try {
    const occurredAt = req.body?.occurredAt ? new Date(req.body.occurredAt) : new Date();
    const result = await submitIssue({
      userId: req.user.id,
      tenantId: req.user.tenantId,
      description,
      route: typeof req.body?.route === 'string' ? req.body.route.slice(0, 500) : undefined,
      userAgent:
        typeof req.body?.userAgent === 'string' ? req.body.userAgent.slice(0, 500) : undefined,
      occurredAt: Number.isNaN(occurredAt.getTime()) ? new Date() : occurredAt,
    });
    logger.warn('[issues] User submitted an issue report', { reportId: result.reportId });
    return res.status(201).json(result);
  } catch (error) {
    logger.error('[issues] Failed to submit issue report', error);
    return res.status(500).json({ error: 'internal_error' });
  }
});

module.exports = router;
