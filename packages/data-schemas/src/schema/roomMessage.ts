import { Schema } from 'mongoose';
import type { IRoomMessage } from '~/types';

const roomMessageSchema: Schema<IRoomMessage> = new Schema<IRoomMessage>(
  {
    roomId: {
      type: String,
      required: true,
    },
    messageId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    authorId: {
      type: String,
      required: true,
    },
    authorName: {
      type: String,
      required: true,
    },
    kind: {
      type: String,
      enum: ['user', 'ai', 'system', 'app'],
      default: 'user',
    },
    text: {
      type: String,
      default: '',
    },
    appUrl: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

roomMessageSchema.index({ roomId: 1, createdAt: 1 });

export default roomMessageSchema;
