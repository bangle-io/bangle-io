import { openedFileSchema } from '@bangle.io/constants';
import { createSliceV2, serialAction, z } from '@bangle.io/nsm';

const SLICE_NAME = 'nsm-slice-file-sha';

export type OpenedFile = z.infer<typeof openedFileSchema>;

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

export const nsmSliceFileSha = createSliceV2([], {
  name: SLICE_NAME,
  initState: initState,
});

export const actSyncEntries = nsmSliceFileSha.createAction(
  'syncEntries',
  serialAction(
    z.object({
      removals: z.array(z.string()),
      additions: z.array(z.string()),
    }),
    ({ removals, additions }) => {
      return (state): InitState => {
        if (removals.length === 0 && additions.length === 0) {
          return state;
        }

        const newOpenedFiles = { ...state.openedFiles };

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
          ...state,
          openedFiles: newOpenedFiles,
        };
      };
    },
  ),
);

export const actUpdateEntry = nsmSliceFileSha.createAction(
  'updateEntry',
  serialAction(
    z.object({
      wsPath: z.string(),
      info: openedFileSchema.partial(),
    }),
    ({ wsPath, info }) => {
      return (state): InitState => {
        const { openedFiles } = state;

        const entry = openedFiles[wsPath];

        if (!entry) {
          return state;
        }

        // do a merge of entry updating any that was provided
        const newEntry: OpenedFile = {
          ...entry,
          ...info,
        };

        const newOpenedFiles = {
          ...openedFiles,
          [wsPath]: newEntry,
        };

        return {
          ...state,
          openedFiles: newOpenedFiles,
        };
      };
    },
  ),
);

export const actBulkUpdateShas = nsmSliceFileSha.createAction(
  'bulkUpdateShas',
  serialAction(
    z.object({
      data: z.array(
        z.object({
          wsPath: z.string(),
          currentDiskSha: z.union([z.string(), z.undefined()]),
          lastKnownDiskSha: z.union([z.string(), z.undefined()]),
        }),
      ),
    }),
    ({ data }) => {
      return (state): InitState => {
        const { openedFiles } = state;

        if (data.length === 0) {
          return state;
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
          ...state,
          openedFiles: newOpenedFiles,
        };
      };
    },
  ),
);
