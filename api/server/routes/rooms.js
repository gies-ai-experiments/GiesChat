const express = require('express');
const { CacheKeys } = require('librechat-data-provider');
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
  assertOwner,
  touchLastSeen,
  subscribe,
  publish,
  onlineUserIds,
  checkLimit,
  ROOM_CREATE_LIMIT,
  ROOM_MESSAGE_LIMIT,
  ROOM_SUMMARIZE_LIMIT,
  ROOM_BUILD_LIMIT,
  detectAiMention,
  runAiReply,
  summarizeRoom,
  attachFile,
  detachFile,
  PollError,
  createPoll,
  votePoll,
  closePoll,
  toPollView,
  draftBuildPrompt,
  runAppBuild,
  isBuildLocked,
} = require('@librechat/api');
const { logger } = require('@librechat/data-schemas');
const { getAppConfig } = require('~/server/services/Config/app');
const { getMCPManager, getFlowStateManager } = require('~/config');
const requireJwtAuth = require('~/server/middleware/requireJwtAuth');
const { getFiles, findToken, createToken, updateToken, deleteTokens } = require('~/models');
const { getLogStores } = require('~/cache');

const router = express.Router();
router.use(requireJwtAuth);

const displayName = (user) => user.name || user.username || user.email || 'Unknown';

const handleRoomError = (res, error, context) => {
  if (error instanceof RoomError || error instanceof PollError) {
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
      polls: snapshot.polls.map((poll) => toPollView(poll, req.user.id)),
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

router.post('/:roomId/files', async (req, res) => {
  try {
    const fileId = req.body?.fileId;
    if (typeof fileId !== 'string' || fileId.length === 0) {
      return res.status(400).json({ error: 'invalid_file' });
    }
    const [file] = await getFiles({ file_id: fileId, user: req.user.id }, null, {});
    if (!file) {
      return res.status(403).json({ error: 'not_file_owner' });
    }
    const room = await attachFile({ roomId: req.params.roomId, userId: req.user.id, fileId });
    const note = await postSystemMessage(
      room.roomId,
      `${displayName(req.user)} attached ${file.filename}`,
    );
    publish(room.roomId, 'message', note);
    publish(room.roomId, 'room', { fileIds: room.fileIds });
    return res.status(201).json(room);
  } catch (error) {
    return handleRoomError(res, error, 'attach-file');
  }
});

router.delete('/:roomId/files/:fileId', async (req, res) => {
  try {
    const room = await detachFile({
      roomId: req.params.roomId,
      userId: req.user.id,
      fileId: req.params.fileId,
    });
    const note = await postSystemMessage(room.roomId, `${displayName(req.user)} removed a file`);
    publish(room.roomId, 'message', note);
    publish(room.roomId, 'room', { fileIds: room.fileIds });
    return res.json(room);
  } catch (error) {
    return handleRoomError(res, error, 'detach-file');
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

router.post('/:roomId/polls', async (req, res) => {
  try {
    const { question, options, expiresAt } = req.body ?? {};
    const poll = await createPoll({
      roomId: req.params.roomId,
      userId: req.user.id,
      question: typeof question === 'string' ? question : '',
      options: Array.isArray(options) ? options.filter((o) => typeof o === 'string') : [],
      expiresAt: typeof expiresAt === 'string' ? new Date(expiresAt) : undefined,
    });
    const note = await postSystemMessage(
      req.params.roomId,
      `${displayName(req.user)} started a poll: ${poll.question}`,
    );
    publish(req.params.roomId, 'message', note);
    publish(req.params.roomId, 'poll', { pollId: poll.pollId });
    return res.status(201).json(toPollView(poll, req.user.id));
  } catch (error) {
    return handleRoomError(res, error, 'poll-create');
  }
});

router.post('/:roomId/polls/:pollId/vote', async (req, res) => {
  try {
    const poll = await votePoll({
      roomId: req.params.roomId,
      pollId: req.params.pollId,
      userId: req.user.id,
      optionIndex: req.body?.optionIndex,
    });
    publish(req.params.roomId, 'poll', { pollId: poll.pollId });
    return res.json(toPollView(poll, req.user.id));
  } catch (error) {
    return handleRoomError(res, error, 'poll-vote');
  }
});

router.post('/:roomId/polls/:pollId/close', async (req, res) => {
  try {
    const { poll, tallyText } = await closePoll({
      roomId: req.params.roomId,
      pollId: req.params.pollId,
      userId: req.user.id,
    });
    const note = await postSystemMessage(req.params.roomId, tallyText);
    publish(req.params.roomId, 'message', note);
    publish(req.params.roomId, 'poll', { pollId: poll.pollId });
    return res.json(toPollView(poll, req.user.id));
  } catch (error) {
    return handleRoomError(res, error, 'poll-close');
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

router.post('/:roomId/build/draft', async (req, res) => {
  try {
    await assertOwner(req.params.roomId, req.user.id);
    if (!checkLimit(`${req.user.id}:build`, ROOM_BUILD_LIMIT.max, ROOM_BUILD_LIMIT.windowMs)) {
      return res.status(429).json({ error: 'rate_limited' });
    }
    const appConfig = await getAppConfig({ role: req.user.role, userId: req.user.id });
    const prompt = await draftBuildPrompt({ roomId: req.params.roomId, appConfig });
    return res.json({ prompt });
  } catch (error) {
    return handleRoomError(res, error, 'build-draft');
  }
});

/** Must match `TRoomBuildStackType` in packages/data-provider/src/types/rooms.ts. */
const STACK_TYPES = new Set([
  'react_website',
  'mobile_app',
  'data_visualization',
  'slides',
  '3d_game',
  'document',
  'spreadsheet',
  'design',
  'animation',
]);

router.post('/:roomId/build', async (req, res) => {
  try {
    await assertOwner(req.params.roomId, req.user.id);
    const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : '';
    const stackType =
      typeof req.body?.stackType === 'string' ? req.body.stackType : 'react_website';
    if (prompt.length === 0 || prompt.length > 8000 || !STACK_TYPES.has(stackType)) {
      return res.status(400).json({ error: 'invalid_build_request' });
    }
    if (isBuildLocked(req.params.roomId)) {
      const note = await postSystemMessage(
        req.params.roomId,
        'A build is already running — one at a time.',
      );
      publish(req.params.roomId, 'message', note);
      return res.status(409).json({ error: 'build_in_progress' });
    }

    const mcpManager = getMCPManager(req.user.id);
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

    runAppBuild({
      roomId: req.params.roomId,
      ownerId: req.user.id,
      ownerName: displayName(req.user),
      prompt,
      stackType,
      callTool,
    }).catch((error) => logger.error('[rooms] app build failed', error));

    return res.status(202).json({ status: 'building' });
  } catch (error) {
    return handleRoomError(res, error, 'build');
  }
});

module.exports = router;
