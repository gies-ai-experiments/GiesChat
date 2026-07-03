import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createModels } from '../models';
import { createTutorSourceMethods } from './tutorSource';

describe('tutorSource methods', () => {
  let server: MongoMemoryServer;
  let methods: ReturnType<typeof createTutorSourceMethods>;

  beforeAll(async () => {
    server = await MongoMemoryServer.create();
    await mongoose.connect(server.getUri());
    createModels(mongoose);
    methods = createTutorSourceMethods(mongoose);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await server.stop();
  });

  it('upserts idempotently on courseValue+url and prunes removed urls', async () => {
    await methods.upsertTutorSource({
      courseValue: 'badm_350',
      url: 'https://x/a',
      title: 'A',
      text: 'first',
    });
    await methods.upsertTutorSource({
      courseValue: 'badm_350',
      url: 'https://x/a',
      title: 'A2',
      text: 'updated',
      summary: 'short summary',
    });
    await methods.upsertTutorSource({
      courseValue: 'badm_350',
      url: 'https://x/b',
      title: 'B',
      text: 'second',
    });

    let records = await methods.findTutorSourcesByCourse('badm_350');
    expect(records).toHaveLength(2);
    const a = records.find((r) => r.url === 'https://x/a');
    expect(a?.title).toBe('A2');
    expect(a?.text).toBe('updated');
    expect(a?.summary).toBe('short summary');

    const deleted = await methods.pruneTutorSources({
      courseValue: 'badm_350',
      keepUrls: ['https://x/a'],
    });
    expect(deleted).toBe(1);

    records = await methods.findTutorSourcesByCourse('badm_350');
    expect(records).toHaveLength(1);
    expect(records[0].url).toBe('https://x/a');
  });
});
