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
    {
      courseCode: 'FIN 221',
      courseLabel: 'Corporate Finance',
      category: 'Finance',
      subject: 'corporate finance',
      isPromoted: true,
    },
    {
      courseCode: 'ECON 102',
      courseLabel: 'Microeconomic Principles',
      category: 'Finance',
      subject: 'microeconomics',
      isPromoted: false,
    },
    {
      courseCode: 'ACCY 200',
      courseLabel: 'Fundamentals of Accounting',
      category: 'Accounting',
      subject: 'accounting',
      isPromoted: false,
    },
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

  it('creates one public agent per tutor grouped under shared subject categories and is idempotent on re-run', async () => {
    const grantFirst = jest.fn().mockResolvedValue({});
    const first = await run(grantFirst);
    expect(first.every((r) => r.created)).toBe(true);

    const grantSecond = jest.fn().mockResolvedValue({});
    const second = await run(grantSecond);
    expect(second.every((r) => r.created)).toBe(false);

    expect(await Agent.countDocuments()).toBe(3);
    expect(await AgentCategory.countDocuments()).toBe(2);

    const finance = await AgentCategory.findOne({ value: 'finance' }).lean();
    expect(finance.label).toBe('Finance');
    expect(finance.order).toBe(0);
    const accounting = await AgentCategory.findOne({ value: 'accounting' }).lean();
    expect(accounting.label).toBe('Accounting');
    expect(accounting.order).toBe(1);

    const fin = await Agent.findOne({ id: 'agent_gies_fin_221' }).lean();
    expect(fin.category).toBe('finance');
    expect(fin.is_promoted).toBe(true);
    expect(fin.provider).toBe('azureOpenAI');
    expect(fin.model).toBe('gpt-5.4');
    expect(fin.instructions).toContain('Academic integrity');
    expect(fin.author.toString()).toBe(authorId.toString());

    const econ = await Agent.findOne({ id: 'agent_gies_econ_102' }).lean();
    expect(econ.category).toBe('finance');
    const accy = await Agent.findOne({ id: 'agent_gies_accy_200' }).lean();
    expect(accy.category).toBe('accounting');

    expect(grantFirst).toHaveBeenCalledTimes(3);
    expect(grantSecond).toHaveBeenCalledTimes(3);
  });

  it('deletes stale per-course categories left over from the old layout', async () => {
    await AgentCategory.create({ value: 'fin_221', label: 'Corporate Finance', order: 9 });

    await run(jest.fn().mockResolvedValue({}));

    expect(await AgentCategory.findOne({ value: 'fin_221' }).lean()).toBeNull();
    expect(await AgentCategory.findOne({ value: 'finance' }).lean()).not.toBeNull();
  });

  it('throws when a tutor entry is missing its category', async () => {
    await expect(
      seedTutors({
        methods: db,
        grantPublic: jest.fn().mockResolvedValue({}),
        authorId,
        tutors: [{ courseCode: 'BADM 999', courseLabel: 'No Category', subject: 'x' }],
        provider: 'azureOpenAI',
        model: 'gpt-5.4',
        buildInstructions,
      }),
    ).rejects.toThrow(/Missing "category" for BADM 999/);
  });
});
