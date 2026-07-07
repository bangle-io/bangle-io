/**
 * In-memory fakes for the File System Access API surface used by this
 * package. They intentionally mimic real DOMException behavior (names and
 * failure modes) so tests exercise the same error-mapping paths as Chrome.
 */

export type FakeEntry = FakeFileHandle | FakeDirectoryHandle;

export type FakePermissions = {
  read: PermissionState;
  readwrite: PermissionState;
};

/**
 * Stand-in for the `File` returned by `FileSystemFileHandle.getFile()`.
 *
 * The repo's vitest global setup replaces `globalThis.File` with a minimal
 * stub (to survive fake-indexeddb's structuredClone), so the fakes cannot use
 * the File constructor; this class provides the pieces of the File contract
 * the library reads (`name`, `size`, `lastModified`, `text`, `arrayBuffer`).
 */
export class FakeFile {
  constructor(
    readonly name: string,
    private readonly data: Uint8Array,
    readonly lastModified: number,
  ) {}

  get size(): number {
    return this.data.byteLength;
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    const copy = new Uint8Array(this.data);
    return copy.buffer;
  }

  async text(): Promise<string> {
    return new TextDecoder().decode(this.data);
  }
}

export class FakeFileHandle {
  readonly kind = 'file' as const;
  /** DOMException thrown by the next write() when set. */
  writeFailure: DOMException | undefined;
  /** Set to false to reject `createWritable({ mode })` with a TypeError. */
  supportsWritableMode = true;
  /** The `mode` value seen by each createWritable call. */
  sawWritableModes: Array<string | undefined> = [];
  /**
   * When assigned, `NativeFs.moveFile` takes the native move path. Left
   * unset by default so fallback copy+delete is what tests exercise unless
   * they opt in.
   */
  move?: (destination: FakeDirectoryHandle, newName?: string) => Promise<void>;

  private content: Uint8Array;
  private lastModified: number;
  private openExclusiveWritables = 0;

  constructor(
    public name: string,
    content = '',
    lastModified = 1_000,
  ) {
    this.content = new TextEncoder().encode(content);
    this.lastModified = lastModified;
  }

  /**
   * When true, getFile() returns the content with its first byte flipped —
   * a same-length corrupt read-back, for move-verification tests.
   */
  corruptReadBack = false;

  async getFile(): Promise<File> {
    let data = this.content;
    if (this.corruptReadBack && data.length > 0) {
      data = new Uint8Array(data);
      data[0] = ((data[0] ?? 0) + 1) % 256;
    }
    return new FakeFile(this.name, data, this.lastModified) as unknown as File;
  }

  async createWritable(options?: {
    keepExistingData?: boolean;
    mode?: string;
  }): Promise<FileSystemWritableFileStream> {
    if (options?.mode !== undefined && !this.supportsWritableMode) {
      throw new TypeError('Unsupported createWritable option: mode');
    }
    this.sawWritableModes.push(options?.mode);
    if (options?.mode === 'exclusive' && this.openExclusiveWritables > 0) {
      throw new DOMException(
        'The file is already locked by another writable',
        'NoModificationAllowedError',
      );
    }
    this.openExclusiveWritables += 1;

    const chunks: Array<{ arrayBuffer: () => Promise<ArrayBuffer> }> = [];
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        this.openExclusiveWritables -= 1;
      }
    };

    const writable = {
      write: async (data: { arrayBuffer: () => Promise<ArrayBuffer> }) => {
        if (this.writeFailure) {
          throw this.writeFailure;
        }
        chunks.push(data);
      },
      close: async () => {
        const buffers = await Promise.all(
          chunks.map((chunk) => chunk.arrayBuffer()),
        );
        const total = buffers.reduce((sum, b) => sum + b.byteLength, 0);
        const merged = new Uint8Array(total);
        let offset = 0;
        for (const buffer of buffers) {
          merged.set(new Uint8Array(buffer), offset);
          offset += buffer.byteLength;
        }
        this.content = merged;
        this.lastModified += 1;
        finish();
      },
      abort: async () => {
        finish();
      },
    };
    return writable as unknown as FileSystemWritableFileStream;
  }
}

export class FakeDirectoryHandle {
  readonly kind = 'directory' as const;
  readonly entries = new Map<string, FakeEntry>();
  permissions: FakePermissions = { read: 'granted', readwrite: 'granted' };
  requestPermissionResult: PermissionState = 'granted';
  /** DOMException thrown when iterating values() when set. */
  iterationFailure: DOMException | undefined;
  /** Called for every entry yielded by values(), at any depth. */
  onEntryVisited?: () => void;

  constructor(public name: string) {}

  async queryPermission(descriptor?: {
    mode?: 'read' | 'readwrite';
  }): Promise<PermissionState> {
    return this.permissions[descriptor?.mode ?? 'read'];
  }

  async requestPermission(descriptor?: {
    mode?: 'read' | 'readwrite';
  }): Promise<PermissionState> {
    if (this.requestPermissionResult === 'granted') {
      this.permissions[descriptor?.mode ?? 'read'] = 'granted';
    }
    return this.requestPermissionResult;
  }

  async *values(): AsyncIterableIterator<FakeEntry> {
    if (this.iterationFailure) {
      throw this.iterationFailure;
    }
    for (const entry of this.entries.values()) {
      this.onEntryVisited?.();
      yield entry;
    }
  }

  async getFileHandle(
    name: string,
    options: { create?: boolean } = {},
  ): Promise<FakeFileHandle> {
    const existing = this.entries.get(name);
    if (existing instanceof FakeFileHandle) {
      return existing;
    }
    if (existing) {
      throw new DOMException(
        `"${name}" is a directory, not a file`,
        'TypeMismatchError',
      );
    }
    if (!options.create) {
      throw new DOMException(`File "${name}" not found`, 'NotFoundError');
    }
    const handle = new FakeFileHandle(name);
    this.entries.set(name, handle);
    return handle;
  }

  async getDirectoryHandle(
    name: string,
    options: { create?: boolean } = {},
  ): Promise<FakeDirectoryHandle> {
    const existing = this.entries.get(name);
    if (existing instanceof FakeDirectoryHandle) {
      return existing;
    }
    if (existing) {
      throw new DOMException(
        `"${name}" is a file, not a directory`,
        'TypeMismatchError',
      );
    }
    if (!options.create) {
      throw new DOMException(`Directory "${name}" not found`, 'NotFoundError');
    }
    const handle = new FakeDirectoryHandle(name);
    this.entries.set(name, handle);
    return handle;
  }

  async removeEntry(name: string): Promise<void> {
    if (!this.entries.delete(name)) {
      throw new DOMException(`Entry "${name}" not found`, 'NotFoundError');
    }
  }
}

export function asRootHandle(
  fake: FakeDirectoryHandle,
): FileSystemDirectoryHandle {
  return fake as unknown as FileSystemDirectoryHandle;
}

/** Seeds `root` with files, creating intermediate directories: `{ 'a/b.md': 'hi' }`. */
export async function seedTree(
  root: FakeDirectoryHandle,
  files: Record<string, string>,
): Promise<void> {
  for (const [path, content] of Object.entries(files)) {
    const segments = path.split('/');
    let dir = root;
    for (const segment of segments.slice(0, -1)) {
      dir = await dir.getDirectoryHandle(segment, { create: true });
    }
    const name = segments[segments.length - 1];
    if (!name) {
      throw new Error(`Invalid seed path: ${path}`);
    }
    dir.entries.set(name, new FakeFileHandle(name, content));
  }
}

/** Returns the fake entry at `path`, or undefined. */
export function getEntry(
  root: FakeDirectoryHandle,
  path: string,
): FakeEntry | undefined {
  let current: FakeEntry | undefined = root;
  for (const segment of path.split('/')) {
    if (!(current instanceof FakeDirectoryHandle)) {
      return undefined;
    }
    current = current.entries.get(segment);
  }
  return current;
}

/**
 * Minimal Web Locks fake: serializes callbacks per lock name and records the
 * order locks were granted in.
 */
export class FakeLockManager {
  grantedLog: string[] = [];
  private queues = new Map<string, Promise<unknown>>();

  request<T>(
    name: string,
    _options: { mode: 'exclusive' },
    callback: () => Promise<T> | T,
  ): Promise<T> {
    const previous = this.queues.get(name) ?? Promise.resolve();
    const run = previous.then(async () => {
      this.grantedLog.push(name);
      return callback();
    });
    this.queues.set(
      name,
      run.catch(() => undefined),
    );
    return run;
  }
}
