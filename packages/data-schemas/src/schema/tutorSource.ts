import { Schema } from 'mongoose';
import type { ITutorSource } from '~/types';

const tutorSourceSchema: Schema<ITutorSource> = new Schema<ITutorSource>(
  {
    courseValue: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      default: '',
    },
    text: {
      type: String,
      default: '',
    },
    summary: {
      type: String,
      default: '',
    },
    scrapedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

tutorSourceSchema.index({ courseValue: 1, url: 1 }, { unique: true });

export default tutorSourceSchema;
