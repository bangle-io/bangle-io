import type { CollabManager } from '@bangle.dev/collab-manager';

import { HELP_FS_WORKSPACE_NAME } from '@bangle.io/constants';
import { cachedCalculateGitFileSha } from '@bangle.io/git-file-sha';
import type { Store } from '@bangle.io/nsm-3';
import { effect, ref } from '@bangle.io/nsm-3';
import type { EternalVars } from '@bangle.io/shared-types';
import { mainApi } from '@bangle.io/worker-common';
import { replicaWorkspaceSlice } from '@bangle.io/worker-replica-slices';
import { fs } from '@bangle.io/workspace-info';
import { createWsPath, resolvePath2 } from '@bangle.io/ws-path';

import { setupCollabManager } from './setup-collab-manager';

export function getCollabManager(store: Store): CollabManager | undefined {
  return getCollabManagerRef(store).current;
}
export const getCollabManagerRef = ref<CollabManager | undefined>(
  () => undefined,
);

export function setCollabManager(
  store: Store,
  eternalVars: EternalVars,
  abortSignal: AbortSignal,
  onError: (error: Error) => void,
) {
  const collabManagerRef = getCollabManagerRef(store);

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

        mainApi().replicaSlices.replicaWorkspaceUpdateFileShaEntry({
          wsPath,
          info: {
            pendingWrite: false,
            // since both the shas at this time will be the same
            lastKnownDiskSha: lastWrittenSha,
            currentDiskSha: lastWrittenSha,
          },
        });
      } catch (error) {
        if (error instanceof Error) {
          onError(error);
        } else {
          throw error;
        }
      }
    },
    (type, wsPath, pendingWrites) => {
      mainApi().replicaSlices.replicaWorkspaceUpdateFileShaEntry({
        wsPath,
        info: {
          pendingWrite: type === 'ADD',
        },
      });
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

  collabManagerRef.current = collabManager;
}

// Removes a document from the collab manager if it is no longer opened.
// TODO: this only removes the doc of an old wsName, but we should also
// close any ws-path that is not opened anymore.
const purgeUnopenedDocs = effect(function purgeUnopenedDocs(store) {
  const { wsName } = replicaWorkspaceSlice.track(store);
  const collabManager = getCollabManagerRef(store).current;
  collabManager?.getAllDocNames().forEach((docName) => {
    const wsPath = createWsPath(docName);

    if (wsName !== resolvePath2(wsPath).wsName) {
      console.log('worker-editor: deleting instance', docName);
      collabManager?.requestDeleteInstance(docName);
    }
  });
});

// An effect that compares the content of file in the disk and
// in the memory. If they are different it will trigger a reset
const staleDocEffect = effect(function staleDocEffect(store) {
  const { openedFilesSha, wsName } = replicaWorkspaceSlice.track(store);
  const collabManager = getCollabManagerRef(store).current;

  if (!openedFilesSha || !wsName) {
    return;
  }

  // donot reset doc needlessly for Helpfs which is a special workspace and
  // does not persist any data
  if (HELP_FS_WORKSPACE_NAME === wsName) {
    return;
  }

  for (const info of Object.values(openedFilesSha)) {
    const { pendingWrite, wsPath, currentDiskSha, lastKnownDiskSha } = info;

    if (
      !pendingWrite &&
      currentDiskSha &&
      lastKnownDiskSha &&
      currentDiskSha !== lastKnownDiskSha
    ) {
      queueMicrotask(() => {
        mainApi().replicaSlices.replicaWorkspaceUpdateFileShaEntry({
          wsPath,
          info: {
            currentDiskSha: currentDiskSha,
            lastKnownDiskSha: currentDiskSha,
          },
        });
        collabManager?.resetDoc(info.wsPath);
      });
    }
  }
});

export const workerEditorEffects = [staleDocEffect, purgeUnopenedDocs];
