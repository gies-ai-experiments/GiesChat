import { Model } from 'mongoose';
import type * as t from '~/types';
import roomParticipantSchema from '~/schema/roomParticipant';
import roomMessageSchema from '~/schema/roomMessage';
import roomPollSchema from '~/schema/roomPoll';
import roomSchema from '~/schema/room';

export function createRoomModel(mongoose: typeof import('mongoose')): Model<t.IRoom> {
  return mongoose.models.Room || mongoose.model<t.IRoom>('Room', roomSchema);
}

export function createRoomParticipantModel(
  mongoose: typeof import('mongoose'),
): Model<t.IRoomParticipant> {
  return (
    mongoose.models.RoomParticipant ||
    mongoose.model<t.IRoomParticipant>('RoomParticipant', roomParticipantSchema)
  );
}

export function createRoomMessageModel(
  mongoose: typeof import('mongoose'),
): Model<t.IRoomMessage> {
  return (
    mongoose.models.RoomMessage || mongoose.model<t.IRoomMessage>('RoomMessage', roomMessageSchema)
  );
}

export function createRoomPollModel(mongoose: typeof import('mongoose')): Model<t.IRoomPoll> {
  return mongoose.models.RoomPoll || mongoose.model<t.IRoomPoll>('RoomPoll', roomPollSchema);
}
