import type { OpenedFile } from '@bangle.io/constants';
import { slice } from '@bangle.io/nsm-3';

const SLICE_NAME = 'nsm-slice-file-sha';

export function createDefaultOpenedFile(wsPath: string): OpenedFile {
  return {
    wsPath,
    pendingWrite: false,
    sha: undefined,
    currentDiskSha: undefined,
    lastKnownDiskSha: undefined,
    currentDiskShaTimestamp: undefined,
  };
}

type InitState = {
  openedFiles: Record<string, OpenedFile>;
};

const initState: InitState = {
  openedFiles: {},
};

export const nsmSliceFileSha = slice([], {
  name: SLICE_NAME,
  state: initState,
});

export const actSyncEntries = nsmSliceFileSha.action(function actSyncEntries({
  removals,
  additions,
}: {
  removals: string[];
  additions: string[];
}) {
  return nsmSliceFileSha.tx((state) => {
    return nsmSliceFileSha.update(state, (sliceState) => {
      if (removals.length === 0 && additions.length === 0) {
        return sliceState;
      }

      const newOpenedFiles = { ...sliceState.openedFiles };

      removals.forEach((wsPath) => {
        delete newOpenedFiles[wsPath];
      });

      additions.forEach((wsPath) => {
        newOpenedFiles[wsPath] = {
          ...createDefaultOpenedFile(wsPath),
          wsPath,
          pendingWrite: false,
        };
      });

      return {
        openedFiles: newOpenedFiles,
      };
    });
  });
});
export const actUpdateEntry = nsmSliceFileSha.action(function actUpdateEntry({
  wsPath,
  info,
}: {
  wsPath: string;
  info: Partial<OpenedFile>;
}) {
  return nsmSliceFileSha.tx((state) => {
    return nsmSliceFileSha.update(state, (sliceState): InitState => {
      const { openedFiles } = sliceState;

      const entry = openedFiles[wsPath];

      if (!entry) {
        return sliceState;
      }

      // do a merge of entry updating any that was provided
      const newEntry: OpenedFile = {
        ...entry,
        ...info,
      };

      return {
        openedFiles: {
          ...openedFiles,
          [wsPath]: newEntry,
        },
      };
    });
  });
});

export const actBulkUpdateShas = nsmSliceFileSha.action(
  function actBulkUpdateShas({
    data,
  }: {
    data: Array<{
      wsPath: string;
      currentDiskSha: string | undefined;
      lastKnownDiskSha: string | undefined;
    }>;
  }) {
    return nsmSliceFileSha.tx((state) => {
      return nsmSliceFileSha.update(state, (sliceState) => {
        const { openedFiles } = sliceState;

        if (data.length === 0) {
          return sliceState;
        }

        const newOpenedFiles = { ...openedFiles };

        for (const { wsPath, ...info } of data) {
          const entry = newOpenedFiles[wsPath];

          if (!entry) {
            continue;
          }

          newOpenedFiles[wsPath] = {
            ...entry,
            ...info,
            currentDiskShaTimestamp: Date.now(),
          };
        }

        return {
          openedFiles: newOpenedFiles,
        };
      });
    });
  },
);
