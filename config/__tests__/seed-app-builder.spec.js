const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { createModels, createMethods } = require('@librechat/data-schemas');
const { seedAppBuilder, AGENT_ID, ALL_REPLIT_TOOLS } = require('../app-builder/seed');

let mongod;
let methods;
let authorId;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  createModels(mongoose);
  methods = createMethods(mongoose, {
    matchModelName: jest.fn(),
    findMatchingPattern: jest.fn(),
    getCache: jest.fn(),
  });
  const User = mongoose.model('User');
  const user = await User.create({ email: 'staff@test.local', provider: 'local' });
  authorId = user._id;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe('seedAppBuilder', () => {
  it('creates the agent once and updates on re-run', async () => {
    const grantPublic = jest.fn();
    const args = { methods, grantPublic, authorId, provider: 'Azure OpenAI', model: 'gpt-5.4' };

    const first = await seedAppBuilder(args);
    expect(first).toEqual({ id: AGENT_ID, created: true });

    const second = await seedAppBuilder(args);
    expect(second).toEqual({ id: AGENT_ID, created: false });

    const Agent = mongoose.model('Agent');
    expect(await Agent.countDocuments({ id: AGENT_ID })).toBe(1);

    const agent = await Agent.findOne({ id: AGENT_ID }).lean();
    expect(agent.tools).toEqual([ALL_REPLIT_TOOLS]);
    expect(agent.mcpServerNames).toEqual(['replit']);
    expect(agent.artifacts).toBe('default');
    expect(agent.category).toBe('build');
    expect(agent.provider).toBe('Azure OpenAI');

    const AgentCategory = mongoose.model('AgentCategory');
    expect(await AgentCategory.countDocuments({ value: 'build' })).toBe(1);

    expect(grantPublic).toHaveBeenCalledTimes(2);
    expect(grantPublic).toHaveBeenCalledWith(agent._id);
  });
});
