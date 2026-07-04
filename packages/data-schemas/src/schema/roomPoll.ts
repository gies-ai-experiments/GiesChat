import { Schema } from 'mongoose';
import type { IRoomPoll } from '~/types';

const roomPollSchema: Schema<IRoomPoll> = new Schema<IRoomPoll>(
  {
    roomId: {
      type: String,
      required: true,
      index: true,
    },
    pollId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    question: {
      type: String,
      required: true,
      trim: true,
    },
    options: {
      type: [String],
      required: true,
    },
    votes: {
      type: Map,
      of: Number,
      default: {},
    },
    status: {
      type: String,
      enum: ['open', 'closed'],
      default: 'open',
    },
    expiresAt: {
      type: Date,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

export default roomPollSchema;
