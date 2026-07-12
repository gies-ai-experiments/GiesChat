import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type * as t from '~/types';
import { createUserMethods } from './user';
import userSchema from '~/schema/user';

let mongoServer: MongoMemoryServer;
let User: mongoose.Model<t.IUser>;
let methods: ReturnType<typeof createUserMethods>;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  User = mongoose.models.User || mongoose.model('User', userSchema);
  methods = createUserMethods(mongoose);
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await mongoose.connection.dropDatabase();
});

describe('completeOnboarding', () => {
  test('stamps onboardingCompletedAt on first completion', async () => {
    const user = await User.create({ email: 'tour@test.edu', provider: 'openid' });
    const updated = await methods.completeOnboarding(user._id.toString());
    expect(updated?.onboardingCompletedAt).toBeInstanceOf(Date);
  });

  test('preserves the original timestamp on repeat completion (replay)', async () => {
    const user = await User.create({ email: 'tour@test.edu', provider: 'openid' });
    const first = await methods.completeOnboarding(user._id.toString());
    const second = await methods.completeOnboarding(user._id.toString());
    expect(second?.onboardingCompletedAt?.getTime()).toBe(first?.onboardingCompletedAt?.getTime());
  });

  test('returns null for an unknown user id', async () => {
    const result = await methods.completeOnboarding(new mongoose.Types.ObjectId().toString());
    expect(result).toBeNull();
  });
});
