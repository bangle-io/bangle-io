import { changeEffect, Slice } from '@bangle.io/nsm';
import { actUpdateEntry, nsmSliceFileSha } from '@bangle.io/nsm-slice-file-sha';
import { nsmPageSlice } from '@bangle.io/slice-page';
import { createWsPath, resolvePath2 } from '@bangle.io/ws-path';

import { getCollabManager, nsmWorkerEditor } from './nsm-worker-editor';

// Removes a document from the collab manager if it is no longer opened.
// TODO: this only removes the doc of an old wsName, but we should also
// close any ws-path that is not opened anymore.
const purgeUnopenedDocs = changeEffect(
  'purgeUnopenedDocs',
  {
    wsName: nsmPageSlice.pick((s) => s.wsName),
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
    openedFiles: nsmSliceFileSha.pick((s) => s.openedFiles),
    sliceState: nsmWorkerEditor.passivePick((s) => s),
  },
  ({ openedFiles, sliceState }, dispatch) => {
    if (!openedFiles) {
      return;
    }
    const collabManager = getCollabManager(sliceState);
    for (const info of Object.values(openedFiles)) {
      const { pendingWrite, wsPath, currentDiskSha, lastKnownDiskSha } = info;

      if (
        !pendingWrite &&
        currentDiskSha &&
        lastKnownDiskSha &&
        currentDiskSha !== lastKnownDiskSha
      ) {
        queueMicrotask(() => {
          dispatch(
            actUpdateEntry({
              wsPath,
              info: {
                currentDiskSha: currentDiskSha,
                lastKnownDiskSha: currentDiskSha,
              },
            }),
          );

          collabManager?.resetDoc(info.wsPath);
        });
      }
    }
  },
);

Slice.registerEffectSlice(nsmWorkerEditor, [purgeUnopenedDocs, staleDocEffect]);
