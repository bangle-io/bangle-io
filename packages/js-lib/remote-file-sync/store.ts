export interface RemoteFileStat {
  /** Creation time in ms since epoch. */
  ctime: number;
  /** Modification time in ms since epoch. */
  mtime: number;
}

export interface RemoteReadResult {
  bytes: Uint8Array;
  stat: RemoteFileStat;
}

/**
 * The server-side storage contract. A reference server implements this against
 * a real backend (disk, S3, database); tests and demos use the in-memory
 * implementation. The {@link createRemoteRouter} maps HTTP requests onto these
 * methods, so implementing this interface is all a backend author must do.
 *
 * Error contract — implementations MUST throw {@link RemoteFileError} with:
 *  - `already-exists` from {@link create} when the target exists.
 *  - `not-found` from {@link write}/{@link delete} when the target is missing,
 *    and from {@link rename} when the source is missing.
 *  - `invalid-path` for malformed paths (use `assertValidFsPath`).
 *
 * {@link read} and {@link stat} return `undefined` for a missing file rather
 * than throwing, mirroring the Bangle.io file-storage provider contract.
 */
export interface RemoteFileStore {
  /** Lists workspace-scoped fs paths under `wsName` (files only). */
  list(wsName: string, signal?: AbortSignal): Promise<string[]>;

  read(
    fsPath: string,
    signal?: AbortSignal,
  ): Promise<RemoteReadResult | undefined>;

  stat(
    fsPath: string,
    signal?: AbortSignal,
  ): Promise<RemoteFileStat | undefined>;

  /** Creates a new file; throws `already-exists` if it already exists. */
  create(
    fsPath: string,
    bytes: Uint8Array,
    signal?: AbortSignal,
  ): Promise<void>;

  /** Overwrites an existing file; throws `not-found` if it does not exist. */
  write(fsPath: string, bytes: Uint8Array, signal?: AbortSignal): Promise<void>;

  /** Deletes a file; throws `not-found` if it does not exist. */
  delete(fsPath: string, signal?: AbortSignal): Promise<void>;

  /**
   * Renames/moves a file. Throws `not-found` if the source is missing.
   * Overwrites the destination if it exists (matching the Bangle.io provider
   * contract); higher layers guard against clobbering.
   */
  rename(from: string, to: string, signal?: AbortSignal): Promise<void>;

  /** Optional: names of workspaces this store hosts (management/bundled mode). */
  listWorkspaces?(signal?: AbortSignal): Promise<string[]>;
}
