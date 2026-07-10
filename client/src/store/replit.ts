import { atom } from 'recoil';
import type { ReplitBuildEvent } from '~/utils/replitLifecycle';

export type ReplitBuildNotification = ReplitBuildEvent & {
  updatedAt: number;
};

export const replitBuildNotification = atom<ReplitBuildNotification | null>({
  key: 'replitBuildNotification',
  default: null,
});
