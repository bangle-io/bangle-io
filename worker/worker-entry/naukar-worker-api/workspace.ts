import type { NaukarWorkerAPI } from '@bangle.io/shared-types';

import type { NaukarStore } from '../store';

export const workspaceInterface = (
  naukarStore: NaukarStore,
): NaukarWorkerAPI['workspace'] => {
  const workspaceInterface: NaukarWorkerAPI['workspace'] = {};

  return workspaceInterface;
};
