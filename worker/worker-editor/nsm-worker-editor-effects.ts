import { changeEffect, Slice } from '@bangle.io/nsm';
import { mainApi } from '@bangle.io/worker-common';
import { replicaWorkspaceSlice } from '@bangle.io/worker-replica-slices';
import { createWsPath, resolvePath2 } from '@bangle.io/ws-path';

import { getCollabManager, nsmWorkerEditor } from './nsm-worker-editor';

// Removes a document from the collab manager if it is no longer opened.
// TODO: this only removes the doc of an old wsName, but we should also
// close any ws-path that is not opened anymore.
const purgeUnopenedDocs = changeEffect(
  'purgeUnopenedDocs',
  {
    wsName: replicaWorkspaceSlice.pick((s) => s.wsName),
    sliceState: nsmWorkerEditor.passivePick((s) => s),
  },
  ({ wsName, sliceState }) => {
    const collabManager = getCollabManager(sliceState);
    // cleanup editor manager docs to save memory if they are not opened anymore
    collabManager?.getAllDocNames().forEach((docName) => {
      const wsPath = createWsPath(docName);

      if (wsName !== resolvePath2(wsPath).wsName) {
        console.log('worker-editor: deleting instance', docName);
        collabManager?.requestDeleteInstance(docName);
      }
    });
  },
);

// An effect that compares the content of file in the disk and
// in the memory. If they are different it will trigger a reset
const staleDocEffect = changeEffect(
  'staleDocEffect',
  {
    openedFilesSha: replicaWorkspaceSlice.pick((s) => s.openedFilesSha),
    sliceState: nsmWorkerEditor.passivePick((s) => s),
  },
  ({ openedFilesSha, sliceState }) => {
    if (!openedFilesSha) {
      return;
    }
    const collabManager = getCollabManager(sliceState);
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
  },
);

Slice.registerEffectSlice(nsmWorkerEditor, [purgeUnopenedDocs, staleDocEffect]);
