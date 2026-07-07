import type { ShowDirectoryPicker } from './types';

/**
 * Whether this environment can open a directory workspace at all. Checks the
 * directory picker specifically — `showOpenFilePicker` support does not imply
 * `showDirectoryPicker` support.
 */
export function supportsNativeFs(): boolean {
  return typeof getShowDirectoryPicker() === 'function';
}

/** Whether `NativeFs.watch` can observe external file changes (Chrome 133+ desktop). */
export function supportsFileSystemObserver(): boolean {
  return (
    typeof (globalThis as { FileSystemObserver?: unknown })
      .FileSystemObserver === 'function'
  );
}

export function getShowDirectoryPicker(): ShowDirectoryPicker | undefined {
  const picker = (globalThis as { showDirectoryPicker?: unknown })
    .showDirectoryPicker;
  return typeof picker === 'function'
    ? (picker as ShowDirectoryPicker)
    : undefined;
}

/**
 * Runtime guard for handles that round-trip through untyped storage (e.g.
 * workspace metadata persisted as `Record<string, unknown>` in IndexedDB).
 */
export function isFileSystemDirectoryHandle(
  value: unknown,
): value is FileSystemDirectoryHandle {
  return (
    typeof value === 'object' &&
    value !== null &&
    'kind' in value &&
    (value as { kind: unknown }).kind === 'directory' &&
    'requestPermission' in value &&
    typeof (value as { requestPermission: unknown }).requestPermission ===
      'function'
  );
}
