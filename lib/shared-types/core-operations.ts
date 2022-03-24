import {
  CORE_OPERATIONS_CLOSE_EDITOR,
  CORE_OPERATIONS_CREATE_BROWSER_WORKSPACE,
  CORE_OPERATIONS_CREATE_NATIVE_FS_WORKSPACE,
  CORE_OPERATIONS_NEW_NOTE,
  CORE_OPERATIONS_NEW_WORKSPACE,
  CORE_OPERATIONS_OPEN_GITHUB_ISSUE,
  CORE_OPERATIONS_REMOVE_ACTIVE_WORKSPACE,
  CORE_OPERATIONS_SERVICE_WORKER_DISMISS_UPDATE,
  CORE_OPERATIONS_SERVICE_WORKER_RELOAD,
  CORE_OPERATIONS_TOGGLE_EDITOR_SPLIT,
  CORE_PALETTES_TOGGLE_NOTES_PALETTE,
  CORE_PALETTES_TOGGLE_OPERATION_PALETTE,
  CORE_PALETTES_TOGGLE_WORKSPACE_PALETTE,
} from '@bangle.io/constants';

export type CoreOperationsType =
  | { name: typeof CORE_OPERATIONS_CLOSE_EDITOR; value: number }
  | {
      name: typeof CORE_OPERATIONS_CREATE_BROWSER_WORKSPACE;
      value: {
        wsName: string;
      };
    }
  | {
      name: typeof CORE_OPERATIONS_CREATE_NATIVE_FS_WORKSPACE;
      value: {
        rootDirHandle: any;
      };
    }
  | { name: typeof CORE_OPERATIONS_NEW_NOTE; value?: { path: string } }
  | { name: typeof CORE_OPERATIONS_NEW_WORKSPACE; value?: undefined }
  | { name: typeof CORE_OPERATIONS_OPEN_GITHUB_ISSUE; value?: undefined }
  | {
      name: typeof CORE_OPERATIONS_REMOVE_ACTIVE_WORKSPACE;
      value: string;
    }
  | {
      name: typeof CORE_OPERATIONS_SERVICE_WORKER_DISMISS_UPDATE;
      value?: undefined;
    }
  | { name: typeof CORE_OPERATIONS_SERVICE_WORKER_RELOAD; value?: undefined }
  | { name: typeof CORE_OPERATIONS_TOGGLE_EDITOR_SPLIT; value?: undefined }
  | { name: typeof CORE_PALETTES_TOGGLE_NOTES_PALETTE; value?: undefined }
  | { name: typeof CORE_PALETTES_TOGGLE_OPERATION_PALETTE; value?: undefined }
  | { name: typeof CORE_PALETTES_TOGGLE_WORKSPACE_PALETTE; value?: undefined };
