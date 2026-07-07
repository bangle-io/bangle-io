import { RemoteFileError } from './errors';
import { assertValidFsPath, assertValidWsName, wsNameOfFsPath } from './path';
import type {
  RemoteFileStat,
  RemoteFileStore,
  RemoteReadResult,
} from './store';

interface Entry {
  bytes: Uint8Array;
  ctime: number;
  mtime: number;
}

/**
 * An in-memory {@link RemoteFileStore}. Used by unit tests, the contract-test
 * harness, and as a zero-config demo backend. `now` is injectable so tests can
 * make timestamps deterministic.
 */
export class MemoryRemoteFileStore implements RemoteFileStore {
  private entries = new Map<string, Entry>();
  private now: () => number;

  constructor(options?: { now?: () => number }) {
    this.now = options?.now ?? (() => Date.now());
  }

  async list(wsName: string): Promise<string[]> {
    assertValidWsName(wsName);
    const prefix = `${wsName}/`;
    return Array.from(this.entries.keys())
      .filter((key) => key.startsWith(prefix))
      .sort((a, b) => a.localeCompare(b));
  }

  async read(fsPath: string): Promise<RemoteReadResult | undefined> {
    assertValidFsPath(fsPath);
    const entry = this.entries.get(fsPath);
    if (!entry) {
      return undefined;
    }
    return { bytes: entry.bytes, stat: this.toStat(entry) };
  }

  async stat(fsPath: string): Promise<RemoteFileStat | undefined> {
    assertValidFsPath(fsPath);
    const entry = this.entries.get(fsPath);
    return entry ? this.toStat(entry) : undefined;
  }

  async create(fsPath: string, bytes: Uint8Array): Promise<void> {
    assertValidFsPath(fsPath);
    if (this.entries.has(fsPath)) {
      throw new RemoteFileError(
        'already-exists',
        `File already exists: ${fsPath}`,
      );
    }
    const now = this.now();
    this.entries.set(fsPath, { bytes, ctime: now, mtime: now });
  }

  async write(fsPath: string, bytes: Uint8Array): Promise<void> {
    assertValidFsPath(fsPath);
    const entry = this.entries.get(fsPath);
    if (!entry) {
      throw new RemoteFileError('not-found', `File not found: ${fsPath}`);
    }
    entry.bytes = bytes;
    entry.mtime = this.now();
  }

  async delete(fsPath: string): Promise<void> {
    assertValidFsPath(fsPath);
    if (!this.entries.has(fsPath)) {
      throw new RemoteFileError('not-found', `File not found: ${fsPath}`);
    }
    this.entries.delete(fsPath);
  }

  async rename(from: string, to: string): Promise<void> {
    assertValidFsPath(from);
    assertValidFsPath(to);
    const entry = this.entries.get(from);
    if (!entry) {
      throw new RemoteFileError('not-found', `File not found: ${from}`);
    }
    this.entries.set(to, { ...entry, mtime: this.now() });
    if (from !== to) {
      this.entries.delete(from);
    }
  }

  async listWorkspaces(): Promise<string[]> {
    const names = new Set<string>();
    for (const key of this.entries.keys()) {
      names.add(wsNameOfFsPath(key));
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }

  private toStat(entry: Entry): RemoteFileStat {
    return { ctime: entry.ctime, mtime: entry.mtime };
  }
}
