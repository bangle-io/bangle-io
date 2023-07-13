import { wireCollabMessageBus } from '@bangle.io/editor-common';
import type { EternalVars, NaukarWorkerAPI } from '@bangle.io/shared-types';
import { setCollabManager } from '@bangle.io/worker-editor';

import type { NaukarStore } from '../store';

export const editorInterface = (
  naukarStore: NaukarStore,
  eternalVars: EternalVars,
  abortSignal: AbortSignal,
): NaukarWorkerAPI['editor'] => {
  const editorInterface: NaukarWorkerAPI['editor'] = {
    registerCollabMessagePort: async (port) => {
      wireCollabMessageBus(
        port,
        eternalVars.editorCollabMessageBus,
        abortSignal,
      );

      setCollabManager(
        naukarStore,
        eternalVars,
        abortSignal,
        // TODO somehow this error is only caught if async
        async (error) => {
          throw error;
        },
      );
    },
  };

  return editorInterface;
};
