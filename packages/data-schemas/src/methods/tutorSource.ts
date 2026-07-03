import type { Model } from 'mongoose';
import type { ITutorSource } from '~/types';

export function createTutorSourceMethods(mongoose: typeof import('mongoose')): {
  upsertTutorSource: (data: {
    courseValue: string;
    url: string;
    title?: string;
    text?: string;
    summary?: string;
  }) => Promise<ITutorSource>;
  findTutorSourcesByCourse: (courseValue: string) => Promise<ITutorSource[]>;
  pruneTutorSources: (params: { courseValue: string; keepUrls: string[] }) => Promise<number>;
} {
  async function upsertTutorSource({
    courseValue,
    url,
    title,
    text,
    summary,
  }: {
    courseValue: string;
    url: string;
    title?: string;
    text?: string;
    summary?: string;
  }): Promise<ITutorSource> {
    const TutorSource = mongoose.models.TutorSource as Model<ITutorSource>;
    return await TutorSource.findOneAndUpdate(
      { courseValue, url },
      {
        $set: {
          title: title || '',
          text: text || '',
          summary: summary || '',
          scrapedAt: new Date(),
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).lean<ITutorSource>();
  }

  async function findTutorSourcesByCourse(courseValue: string): Promise<ITutorSource[]> {
    const TutorSource = mongoose.models.TutorSource as Model<ITutorSource>;
    return await TutorSource.find({ courseValue }).sort({ url: 1 }).lean<ITutorSource[]>();
  }

  async function pruneTutorSources({
    courseValue,
    keepUrls,
  }: {
    courseValue: string;
    keepUrls: string[];
  }): Promise<number> {
    const TutorSource = mongoose.models.TutorSource as Model<ITutorSource>;
    const result = await TutorSource.deleteMany({ courseValue, url: { $nin: keepUrls } });
    return result.deletedCount ?? 0;
  }

  return { upsertTutorSource, findTutorSourcesByCourse, pruneTutorSources };
}

export type TutorSourceMethods = ReturnType<typeof createTutorSourceMethods>;
