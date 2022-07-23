import { SliceKey } from '@bangle.io/create-store';

export interface OpenedFile {
  readonly wsPath: string;
  readonly pendingWrite: boolean;
  readonly sha?: string;
  readonly currentDiskSha?: string;
  // The last sha we saw on disk either during writing or reading
  readonly lastKnownDiskSha?: string;
  readonly currentDiskShaTimestamp?: number;
}

export const UPDATE_ENTRY =
  'action::@bangle.io/slice-workspace-opened-doc-info:update-entry';

export const SYNC_ENTRIES =
  'action::@bangle.io/slice-workspace-opened-doc-info:sync-entries';

export const BULK_UPDATE_CURRENT_DISK_SHA =
  'action::@bangle.io/slice-workspace-opened-doc-info:bulk-update-current-disk-sha';

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
      name: typeof BULK_UPDATE_CURRENT_DISK_SHA;
      value: {
        data: Array<{ wsPath: string; currentDiskSha: string | null }>;
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
