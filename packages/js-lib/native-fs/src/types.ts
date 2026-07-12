/**
 * Module-scoped typings for File System Access API surface that TypeScript's
 * dom lib does not (fully) model yet. Kept local instead of ambient globals so
 * this package documents exactly which non-standard surface it relies on.
 */

export type NativeFsPermissionMode = 'read' | 'readwrite';

export interface DirectoryPickerOpts {
  /**
   * Picker remembers the last-used directory per `id`, so passing a stable id
   * reopens the picker where the user left off.
   */
  id?: string;
  /** Requesting `readwrite` up front avoids a second permission prompt. */
  mode?: NativeFsPermissionMode;
  startIn?: FileSystemHandle | string;
}

export type ShowDirectoryPicker = (
  options?: DirectoryPickerOpts,
) => Promise<FileSystemDirectoryHandle>;

/**
 * `queryPermission`/`requestPermission` exist on all Chromium handles but are
 * absent in some engines (e.g. Safari's OPFS handles), so both are modeled as
 * optional and feature-detected at the call site.
 */
export interface PermissionCapableHandle {
  queryPermission?: (descriptor?: {
    mode?: NativeFsPermissionMode;
  }) => Promise<PermissionState>;
  requestPermission?: (descriptor?: {
    mode?: NativeFsPermissionMode;
  }) => Promise<PermissionState>;
}

/**
 * `createWritable({ mode })` (Chrome 121+): `exclusive` makes concurrent
 * writers fail fast instead of silently last-close-wins.
 */
export interface CreateWritableOpts {
  keepExistingData?: boolean;
  mode?: 'exclusive' | 'siloed';
}

export interface MovableFileHandle {
  move?: (
    destination: FileSystemDirectoryHandle,
    newName?: string,
  ) => Promise<void>;
}

// ---- FileSystemObserver (Chrome 133+, WHATWG fs proposal) ----

export type FileSystemChangeType =
  | 'appeared'
  | 'disappeared'
  | 'modified'
  | 'moved'
  | 'unknown'
  | 'errored';

export interface FileSystemChangeRecordLike {
  type?: string;
  relativePathComponents?: readonly string[];
  relativePathMovedFrom?: readonly string[] | null;
  changedHandle?: FileSystemHandle;
}

interface FileSystemObserverLike {
  observe(
    handle: FileSystemHandle,
    options?: { recursive?: boolean },
  ): Promise<void>;
  disconnect(): void;
}

export type FileSystemObserverConstructor = new (
  callback: (
    records: readonly FileSystemChangeRecordLike[],
    observer: FileSystemObserverLike,
  ) => void,
) => FileSystemObserverLike;
