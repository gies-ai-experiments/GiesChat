const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { logger, createModels, createMethods } = require('@librechat/data-schemas');
const { seedTutors } = require('../gies-tutors/seed');
const { storeSources } = require('../gies-tutors/store');
const { summarizePages } = require('../gies-tutors/summarize');
const { buildReference } = require('../gies-tutors/reference');
const { buildInstructions } = require('../gies-tutors/persona');

jest.mock('../connect', () => jest.fn().mockResolvedValue(true));
logger.silent = true;

// Fake summarizer: prefixes so we can assert the summary (not raw text) is injected
const fakeSummarize = async (page) => `SUMMARY: ${page.text}`;

describe('seedTutors with knowledge', () => {
  let mongoServer;
  let db;
  let authorId;
  let Agent;
  let TutorSource;

  const tutors = [
    {
      courseCode: 'BADM 350',
      courseLabel: 'IT for Networked Organizations',
      category: 'Business Administration',
      subject: 'IT strategy',
      isPromoted: true,
      sourceUrls: ['https://x/a', 'https://x/b'],
    },
  ];

  // Fake scraper: returns whatever pages we hand it
  const makeScrape = (pages) => async () => pages;

  const run = (scrapeSources) =>
    seedTutors({
      methods: db,
      grantPublic: jest.fn().mockResolvedValue({}),
      authorId,
      tutors,
      provider: 'azureOpenAI',
      model: 'gpt-5.4',
      buildInstructions,
      scrapeSources,
      summarizePages,
      storeSources,
      buildReference,
      summarize: fakeSummarize,
    });

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    createModels(mongoose);
    Agent = mongoose.models.Agent;
    TutorSource = mongoose.models.TutorSource;
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

  it('stores tagged sources + summaries, injects the summary, and prunes removed urls', async () => {
    await run(
      makeScrape([
        { url: 'https://x/a', title: 'Syllabus', text: 'covers databases' },
        { url: 'https://x/b', title: 'Schedule', text: 'week by week' },
      ]),
    );

    let sources = await TutorSource.find({ courseValue: 'badm_350' }).lean();
    expect(sources).toHaveLength(2);
    expect(sources.every((s) => s.courseValue === 'badm_350')).toBe(true);
    const stored = sources.find((s) => s.url === 'https://x/a');
    expect(stored.text).toBe('covers databases');
    expect(stored.summary).toBe('SUMMARY: covers databases');

    let agent = await Agent.findOne({ id: 'agent_gies_badm_350' }).lean();
    expect(agent.instructions).toContain('Academic integrity');
    expect(agent.instructions).toContain('Course reference');
    // the SUMMARY (preferred over raw text) is what's injected
    expect(agent.instructions).toContain('SUMMARY: covers databases');

    // Re-run with one url dropped + changed text -> pruned, re-summarized, no duplicates
    await run(makeScrape([{ url: 'https://x/a', title: 'Syllabus', text: 'covers databases v2' }]));

    sources = await TutorSource.find({ courseValue: 'badm_350' }).lean();
    expect(sources).toHaveLength(1);
    expect(sources[0].url).toBe('https://x/a');
    expect(sources[0].text).toBe('covers databases v2');
    expect(sources[0].summary).toBe('SUMMARY: covers databases v2');

    agent = await Agent.findOne({ id: 'agent_gies_badm_350' }).lean();
    expect(agent.instructions).toContain('SUMMARY: covers databases v2');
    expect(agent.instructions).not.toContain('week by week');
  });
});
