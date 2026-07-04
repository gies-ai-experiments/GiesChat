const express = require('express');
const {
  RoomError,
  createRoom,
  joinRoom,
  getMyRooms,
  getRoomSnapshot,
  postMessage,
  archiveRoom,
  postSystemMessage,
  assertMember,
  touchLastSeen,
  subscribe,
  publish,
  onlineUserIds,
  checkLimit,
  ROOM_CREATE_LIMIT,
  ROOM_MESSAGE_LIMIT,
  ROOM_SUMMARIZE_LIMIT,
  detectAiMention,
  runAiReply,
  summarizeRoom,
} = require('@librechat/api');
const { logger } = require('@librechat/data-schemas');
const { getAppConfig } = require('~/server/services/Config/app');
const requireJwtAuth = require('~/server/middleware/requireJwtAuth');
const { getFiles } = require('~/models');

const router = express.Router();
router.use(requireJwtAuth);

const displayName = (user) => user.name || user.username || user.email || 'Unknown';

const handleRoomError = (res, error, context) => {
  if (error instanceof RoomError) {
    return res.status(error.status).json({ error: error.code });
  }
  logger.error(`[rooms] ${context}`, error);
  return res.status(500).json({ error: 'internal_error' });
};

router.post('/', async (req, res) => {
  try {
    if (!checkLimit(`${req.user.id}:create`, ROOM_CREATE_LIMIT.max, ROOM_CREATE_LIMIT.windowMs)) {
      return res.status(429).json({ error: 'rate_limited' });
    }
    const { title, agentId, contextText } = req.body ?? {};
    if (typeof title !== 'string' || title.trim().length === 0 || title.length > 200) {
      return res.status(400).json({ error: 'invalid_title' });
    }
    const room = await createRoom({
      userId: req.user.id,
      name: displayName(req.user),
      title,
      agentId: typeof agentId === 'string' && agentId.length > 0 ? agentId : undefined,
      contextText: typeof contextText === 'string' ? contextText : undefined,
    });
    return res.status(201).json(room);
  } catch (error) {
    return handleRoomError(res, error, 'create');
  }
});

router.get('/', async (req, res) => {
  try {
    const rooms = await getMyRooms(req.user.id);
    return res.json(rooms);
  } catch (error) {
    return handleRoomError(res, error, 'list');
  }
});

router.get('/:roomId', async (req, res) => {
  try {
    const snapshot = await getRoomSnapshot({ roomId: req.params.roomId, userId: req.user.id });
    const online = new Set(onlineUserIds(req.params.roomId));
    const files =
      snapshot.room.fileIds.length > 0
        ? await getFiles({ file_id: { $in: snapshot.room.fileIds } }, null, {})
        : [];
    return res.json({
      ...snapshot,
      participants: snapshot.participants.map((p) => ({
        ...p,
        online: online.has(p.userId.toString()),
      })),
      files,
    });
  } catch (error) {
    return handleRoomError(res, error, 'snapshot');
  }
});

router.post('/:roomId/join', async (req, res) => {
  try {
    const result = await joinRoom({
      roomId: req.params.roomId,
      userId: req.user.id,
      name: displayName(req.user),
    });
    if (result.systemMessage) {
      publish(req.params.roomId, 'message', result.systemMessage);
    }
    return res.json({ roomId: result.room.roomId, joined: result.joined });
  } catch (error) {
    return handleRoomError(res, error, 'join');
  }
});

router.post('/:roomId/messages', async (req, res) => {
  try {
    if (
      !checkLimit(`${req.user.id}:message`, ROOM_MESSAGE_LIMIT.max, ROOM_MESSAGE_LIMIT.windowMs)
    ) {
      return res.status(429).json({ error: 'rate_limited' });
    }
    const text = typeof req.body?.text === 'string' ? req.body.text : '';
    const message = await postMessage({
      roomId: req.params.roomId,
      userId: req.user.id,
      name: displayName(req.user),
      text,
    });
    publish(req.params.roomId, 'message', message);
    if (detectAiMention(message.text)) {
      const aiParams = {
        roomId: req.params.roomId,
        authorName: displayName(req.user),
        question: message.text,
        userId: req.user.id,
      };
      getAppConfig({ role: req.user.role, userId: req.user.id })
        .then((appConfig) => runAiReply({ ...aiParams, appConfig }))
        .catch((error) => logger.error('[rooms] AI reply dispatch failed', error));
    }
    return res.status(201).json(message);
  } catch (error) {
    return handleRoomError(res, error, 'message');
  }
});

router.post('/:roomId/summarize', async (req, res) => {
  try {
    await assertMember(req.params.roomId, req.user.id);
    if (
      !checkLimit(
        `${req.user.id}:summarize`,
        ROOM_SUMMARIZE_LIMIT.max,
        ROOM_SUMMARIZE_LIMIT.windowMs,
      )
    ) {
      return res.status(429).json({ error: 'rate_limited' });
    }
    const scope = req.body?.scope === 'me' ? 'me' : 'room';
    const appConfig = await getAppConfig({ role: req.user.role, userId: req.user.id });
    const result = await summarizeRoom({ roomId: req.params.roomId, scope, appConfig });
    return res.json(result);
  } catch (error) {
    return handleRoomError(res, error, 'summarize');
  }
});

router.post('/:roomId/typing', async (req, res) => {
  try {
    await assertMember(req.params.roomId, req.user.id);
    publish(req.params.roomId, 'typing', {
      userId: req.user.id,
      name: displayName(req.user),
    });
    return res.status(204).end();
  } catch (error) {
    return handleRoomError(res, error, 'typing');
  }
});

router.patch('/:roomId/archive', async (req, res) => {
  try {
    const room = await archiveRoom({ roomId: req.params.roomId, userId: req.user.id });
    const note = await postSystemMessage(room.roomId, 'Room archived by the owner');
    publish(room.roomId, 'message', note);
    return res.json(room);
  } catch (error) {
    return handleRoomError(res, error, 'archive');
  }
});

router.get('/:roomId/stream', async (req, res) => {
  try {
    await assertMember(req.params.roomId, req.user.id);
    const unsubscribe = subscribe(req.params.roomId, req.user.id, res);
    req.on('close', () => {
      unsubscribe();
      touchLastSeen(req.params.roomId, req.user.id).catch((error) =>
        logger.error('[rooms] lastSeen update failed', error),
      );
    });
  } catch (error) {
    return handleRoomError(res, error, 'stream');
  }
});

module.exports = router;
