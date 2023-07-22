import type { CollabServerState } from '@bangle.dev/collab-manager';

export type CollabStateInfo = {
  wsPath: string;
  collabState: CollabServerState;
};
