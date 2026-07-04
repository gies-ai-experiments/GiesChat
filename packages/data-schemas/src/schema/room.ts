import { Schema } from 'mongoose';
import type { IRoom } from '~/types';

const roomSchema: Schema<IRoom> = new Schema<IRoom>(
  {
    roomId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    creatorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    agentId: {
      type: String,
    },
    fileIds: {
      type: [String],
      default: [],
    },
    contextText: {
      type: String,
    },
    archived: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

export default roomSchema;
