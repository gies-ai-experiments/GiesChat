import { Schema } from 'mongoose';
import type { IRoomParticipant } from '~/types';

const roomParticipantSchema: Schema<IRoomParticipant> = new Schema<IRoomParticipant>(
  {
    roomId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ['owner', 'member'],
      default: 'member',
    },
    lastSeenAt: {
      type: Date,
    },
    lastReadAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

roomParticipantSchema.index({ roomId: 1, userId: 1 }, { unique: true });

export default roomParticipantSchema;
