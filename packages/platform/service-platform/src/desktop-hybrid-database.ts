import { BaseService, type BaseServiceContext } from '@bangle.io/base-utils';
import { SERVICE_NAME } from '@bangle.io/constants';
import type {
  BaseAppDatabase,
  BaseDatabaseService,
  DatabaseChange,
  DatabaseQueryOptions,
} from '@bangle.io/types';

/**
 * Composite `BaseAppDatabase` for the Electron desktop. It fronts two backends:
 *
 * - `nativeConfigDatabase` — the native, file-backed store (serializable config).
 * - `idbDatabase` — Chromium IndexedDB, which alone can persist records carrying
 *   a non-serializable value such as a native-FS `FileSystemDirectoryHandle`.
 *
 * Each record lives in exactly one backend. Writes route by whether the new
 * value contains a file-system handle; when a record moves between backends the
 * stale copy in the other store is deleted, so reads and `getAllEntries` never
 * see a key twice.
 */
export class DesktopHybridDatabaseService
  extends BaseService
  implements BaseAppDatabase
{
  static deps = ['nativeConfigDatabase', 'idbDatabase'] as const;

  constructor(
    context: BaseServiceContext,
    private dep: {
      nativeConfigDatabase: BaseDatabaseService;
      idbDatabase: BaseDatabaseService;
    },
  ) {
    super(SERVICE_NAME.desktopHybridDatabaseService, context, dep);
  }

  async hookMount(): Promise<void> {}

  private get native(): BaseDatabaseService {
    return this.dep.nativeConfigDatabase;
  }

  private get idb(): BaseDatabaseService {
    return this.dep.idbDatabase;
  }

  async getEntry(
    key: string,
    options: DatabaseQueryOptions,
  ): Promise<{ found: boolean; value: unknown }> {
    const nativeResult = await this.native.getEntry(key, options);
    if (nativeResult.found) {
      return nativeResult;
    }
    return this.idb.getEntry(key, options);
  }

  async updateEntry(
    key: string,
    updateCallback: (options: { value: unknown; found: boolean }) => {
      value: unknown;
    } | null,
    options: DatabaseQueryOptions,
  ): Promise<{ value: unknown; found: boolean }> {
    // Find where the record currently lives so the callback sees the real value,
    // then route the write by the serializability of the new value.
    const nativeExisting = await this.native.getEntry(key, options);
    const existing = nativeExisting.found
      ? nativeExisting
      : await this.idb.getEntry(key, options);

    // The callback may throw (e.g. "already exists"); let that propagate.
    const updated = updateCallback({
      found: existing.found,
      value: existing.value,
    });

    if (!updated) {
      return { found: false, value: undefined };
    }

    const routeToIdb = containsFileSystemHandle(updated.value);
    const target = routeToIdb ? this.idb : this.native;

    const result = await target.updateEntry(
      key,
      () => ({ value: updated.value }),
      options,
    );

    // Drop a stale copy left in the other backend when the record migrated.
    const existedInNative = nativeExisting.found;
    const existedInIdb = existing.found && !nativeExisting.found;
    if (routeToIdb && existedInNative) {
      await this.native.deleteEntry(key, options);
    } else if (!routeToIdb && existedInIdb) {
      await this.idb.deleteEntry(key, options);
    }

    return result;
  }

  async deleteEntry(key: string, options: DatabaseQueryOptions): Promise<void> {
    await Promise.all([
      this.native.deleteEntry(key, options),
      this.idb.deleteEntry(key, options),
    ]);
  }

  async getAllEntries(options: DatabaseQueryOptions): Promise<unknown[]> {
    const [nativeEntries, idbEntries] = await Promise.all([
      this.native.getAllEntries(options),
      this.idb.getAllEntries(options),
    ]);
    // A key resides in exactly one backend, so concatenation cannot duplicate.
    return [...nativeEntries, ...idbEntries];
  }

  subscribe(
    options: DatabaseQueryOptions,
    callback: (change: DatabaseChange) => void,
    signal: AbortSignal,
  ): void {
    this.native.subscribe(options, callback, signal);
    this.idb.subscribe(options, callback, signal);
  }
}

/**
 * Whether a value (recursively) contains a File System Access handle, which can
 * be persisted by IndexedDB (structured clone) but not serialized to a JSON
 * file. Cycles are guarded with a visited set.
 */
export function containsFileSystemHandle(
  value: unknown,
  seen: WeakSet<object> = new WeakSet(),
): boolean {
  if (isFileSystemHandleLike(value)) {
    return true;
  }
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  if (seen.has(value)) {
    return false;
  }
  seen.add(value);

  if (Array.isArray(value)) {
    return value.some((item) => containsFileSystemHandle(item, seen));
  }
  return Object.values(value as Record<string, unknown>).some((item) =>
    containsFileSystemHandle(item, seen),
  );
}

function isFileSystemHandleLike(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const kind = (value as { kind?: unknown }).kind;
  const requestPermission = (value as { requestPermission?: unknown })
    .requestPermission;
  return (
    (kind === 'file' || kind === 'directory') &&
    typeof requestPermission === 'function'
  );
}
