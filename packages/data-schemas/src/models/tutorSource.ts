import { Model } from 'mongoose';
import type * as t from '~/types';
import tutorSourceSchema from '~/schema/tutorSource';

export function createTutorSourceModel(mongoose: typeof import('mongoose')): Model<t.ITutorSource> {
  return (
    mongoose.models.TutorSource || mongoose.model<t.ITutorSource>('TutorSource', tutorSourceSchema)
  );
}
