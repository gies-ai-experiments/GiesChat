const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { logger, createModels, createMethods } = require('@librechat/data-schemas');
const { seedTutors } = require('../gies-tutors/seed');
const { buildInstructions } = require('../gies-tutors/persona');

// Prevent the CLI's DB connect from running during unit tests
jest.mock('../connect', () => jest.fn().mockResolvedValue(true));
logger.silent = true;

describe('seedTutors', () => {
  let mongoServer;
  let db;
  let authorId;
  let Agent;
  let AgentCategory;

  const tutors = [
    { courseCode: 'BADM 350', courseLabel: 'IT for Networked Organizations', subject: 'IT strategy', isPromoted: true },
    { courseCode: 'ACCY 200', courseLabel: 'Fundamentals of Accounting', subject: 'accounting', isPromoted: false },
  ];

  const run = (grantPublic) =>
    seedTutors({
      methods: db,
      grantPublic,
      authorId,
      tutors,
      provider: 'azureOpenAI',
      model: 'gpt-5.4',
      buildInstructions,
    });

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    createModels(mongoose);
    Agent = mongoose.models.Agent;
    AgentCategory = mongoose.models.AgentCategory;

    db = createMethods(mongoose, {
      matchModelName: (m) => m,
      findMatchingPattern: () => null,
      getCache: () => ({ get: async () => null, set: async () => {}, del: async () => {} }),
    });

    authorId = new mongoose.Types.ObjectId();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it('creates one public agent + category per tutor and is idempotent on re-run', async () => {
    const grantFirst = jest.fn().mockResolvedValue({});
    const first = await run(grantFirst);
    expect(first.every((r) => r.created)).toBe(true);

    const grantSecond = jest.fn().mockResolvedValue({});
    const second = await run(grantSecond);
    expect(second.every((r) => r.created)).toBe(false);

    expect(await Agent.countDocuments()).toBe(2);
    expect(await AgentCategory.countDocuments()).toBe(2);

    const badm = await Agent.findOne({ id: 'agent_gies_badm_350' }).lean();
    expect(badm.category).toBe('badm_350');
    expect(badm.is_promoted).toBe(true);
    expect(badm.provider).toBe('azureOpenAI');
    expect(badm.model).toBe('gpt-5.4');
    expect(badm.instructions).toContain('Academic integrity');
    expect(badm.author.toString()).toBe(authorId.toString());

    expect(grantFirst).toHaveBeenCalledTimes(2);
    expect(grantSecond).toHaveBeenCalledTimes(2);
  });
});
