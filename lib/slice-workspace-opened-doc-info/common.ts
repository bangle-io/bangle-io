import { SliceKey } from '@bangle.io/create-store';
// The idea of this slice is to store information related to a opened files sha.
// And then use that information to determine if the file was changed externally (outside of the application).
// Note: the slice serves as a common place to store this information and provides api
// to modify this information, but not on how and when to update this information which
// is someone elses responsibility.
export interface OpenedFile {
  readonly wsPath: string;
  readonly pendingWrite: boolean;
  readonly sha?: string | null;
  // the sha representing the sha currently on the disk. The faster this is updated, the faster
  // we can react to an external modification a file.
  readonly currentDiskSha?: string | null;
  // The last sha our application wrote to the disk or read (if the file was not modified).
  // Comparing this to currentDiskSha will determine if the file was modified externally.
  readonly lastKnownDiskSha?: string | null;
  readonly currentDiskShaTimestamp?: number | null;
}

export function createDefaultOpenedFile(wsPath: string): OpenedFile {
  return {
    wsPath,
    pendingWrite: false,
    sha: null,
    currentDiskSha: null,
    lastKnownDiskSha: null,
    currentDiskShaTimestamp: null,
  };
}

export const UPDATE_ENTRY =
  'action::@bangle.io/slice-workspace-opened-doc-info:update-entry';

export const SYNC_ENTRIES =
  'action::@bangle.io/slice-workspace-opened-doc-info:sync-entries';

export const BULK_UPDATE_SHAS =
  'action::@bangle.io/slice-workspace-opened-doc-info:bulk-update-shas';

export type WorkspaceOpenedDocInfoAction =
  | {
      name: typeof SYNC_ENTRIES;
      value: {
        additions: string[];
        removals: string[];
      };
    }
  | {
      name: typeof UPDATE_ENTRY;
      value: {
        wsPath: string;
        info: Partial<Omit<OpenedFile, 'wsPath'>>;
      };
    }
  | {
      name: typeof BULK_UPDATE_SHAS;
      value: {
        data: Array<{
          wsPath: string;
          currentDiskSha?: string | null;
          lastKnownDiskSha?: string | null;
        }>;
      };
    };

export const workspaceOpenedDocInfoKey = new SliceKey<
  {
    readonly openedFiles: {
      readonly [wsPath: string]: OpenedFile;
    };
  },
  WorkspaceOpenedDocInfoAction
>('@bangle.io/slice-workspace-opened-doc-info/slice-key');
