import type { CollabManager } from '@bangle.dev/collab-manager';

import { cachedCalculateGitFileSha } from '@bangle.io/git-file-sha';
import type { InferSliceName, Transaction } from '@bangle.io/nsm';
import { createSliceV2 } from '@bangle.io/nsm';
import { actUpdateEntry, nsmSliceFileSha } from '@bangle.io/nsm-slice-file-sha';
import type { EternalVars } from '@bangle.io/shared-types';
import { BaseError } from '@bangle.io/utils';
import { fs } from '@bangle.io/workspace-info';
import { createWsPath } from '@bangle.io/ws-path';

import { setupCollabManager } from './setup-collab-manager';

type RefKey = { key: symbol };

const initState: {
  refKey?: RefKey;
} = {};

const collabWeakMap = new WeakMap<RefKey, CollabManager>();

export const nsmWorkerEditor = createSliceV2([nsmSliceFileSha], {
  name: 'worker/worker-editor',
  initState,
});

const actSetupRefKey = nsmWorkerEditor.createAction(
  'setupRefKey',
  (refKey: RefKey) => {
    return (state): typeof initState => {
      return {
        ...state,
        refKey,
      };
    };
  },
);

export function getCollabManager(
  sliceState: typeof initState,
): CollabManager | undefined {
  if (!sliceState.refKey) {
    return undefined;
  }

  const result = collabWeakMap.get(sliceState.refKey);

  if (!result) {
    return undefined;
  }

  return result;
}

export function setCollabManager(
  dispatch: (
    tx: Transaction<
      | InferSliceName<typeof nsmSliceFileSha>
      | InferSliceName<typeof nsmWorkerEditor>,
      any
    >,
  ) => void,
  eternalVars: EternalVars,
  abortSignal: AbortSignal,
  onError: (error: Error) => void,
) {
  const refKey = {
    key: Symbol('refKey'),
  };

  dispatch(actSetupRefKey(refKey));

  const collabManager = setupCollabManager(
    eternalVars.extensionRegistry.specRegistry.schema,
    eternalVars.editorCollabMessageBus,
    async (collabStateInfo) => {
      try {
        const wsPath = createWsPath(collabStateInfo.wsPath);
        const file = fs.docToFile(
          wsPath,
          collabStateInfo.collabState.doc,
          eternalVars.extensionRegistry,
        );

        const lastWrittenSha = await cachedCalculateGitFileSha(file);

        await fs.writeFile(wsPath, file, lastWrittenSha);

        dispatch(
          actUpdateEntry({
            wsPath,
            info: {
              pendingWrite: false,
              // since both the shas at this time will be the same
              lastKnownDiskSha: lastWrittenSha,
              currentDiskSha: lastWrittenSha,
            },
          }),
        );
      } catch (error) {
        if (error instanceof BaseError) {
          onError(error);

          return;
        }
        throw error;
      }
    },
    (type, wsPath, pendingWrites) => {
      dispatch(
        actUpdateEntry({
          wsPath,
          info: {
            pendingWrite: type === 'ADD',
          },
        }),
      );
    },
    abortSignal,
    eternalVars.extensionRegistry,
    onError,
  );

  abortSignal.addEventListener(
    'abort',
    () => {
      collabManager.destroy();
    },
    {
      once: true,
    },
  );

  collabWeakMap.set(refKey, collabManager);
}
