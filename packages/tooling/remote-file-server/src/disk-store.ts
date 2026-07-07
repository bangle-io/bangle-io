import type { Dirent } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {
  assertValidFsPath,
  assertValidWsName,
  RemoteFileError,
  type RemoteFileStat,
  type RemoteFileStore,
  type RemoteReadResult,
} from '@bangle.io/remote-file-sync';

function isErrnoException(
  error: unknown,
  code: string,
): error is NodeJS.ErrnoException {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as NodeJS.ErrnoException).code === code
  );
}

/**
 * A {@link RemoteFileStore} backed by the local filesystem. Files live under
 * `<root>/<wsName>/<...>`; the first path segment is the workspace name, so a
 * single root can host many workspaces side by side.
 *
 * Every path is validated and re-checked to stay within `root`, so a crafted
 * request can never read or write outside the data directory.
 */
export class DiskRemoteFileStore implements RemoteFileStore {
  private root: string;
  private tmpCounter = 0;

  constructor(root: string) {
    this.root = path.resolve(root);
  }

  private resolve(fsPath: string): string {
    assertValidFsPath(fsPath);
    const full = path.resolve(this.root, fsPath);
    const rootWithSep = this.root.endsWith(path.sep)
      ? this.root
      : this.root + path.sep;
    if (full !== this.root && !full.startsWith(rootWithSep)) {
      throw new RemoteFileError(
        'invalid-path',
        `Path escapes storage root: ${fsPath}`,
      );
    }
    return full;
  }

  async list(wsName: string): Promise<string[]> {
    assertValidWsName(wsName);
    const wsDir = path.resolve(this.root, wsName);
    const results: string[] = [];
    await this.walk(wsDir, wsName, results);
    return results.sort((a, b) => a.localeCompare(b));
  }

  private async readDirSafe(dir: string): Promise<Dirent<string>[]> {
    try {
      return await fs.readdir(dir, { withFileTypes: true });
    } catch (error) {
      if (
        isErrnoException(error, 'ENOENT') ||
        isErrnoException(error, 'ENOTDIR')
      ) {
        return [];
      }
      throw error;
    }
  }

  private async walk(
    dir: string,
    relPrefix: string,
    out: string[],
  ): Promise<void> {
    const entries = await this.readDirSafe(dir);
    for (const entry of entries) {
      // Skip dotfiles/dot-directories (.git, .DS_Store, etc.).
      if (entry.name.startsWith('.')) {
        continue;
      }
      const childRel = `${relPrefix}/${entry.name}`;
      if (entry.isDirectory()) {
        await this.walk(path.join(dir, entry.name), childRel, out);
      } else if (entry.isFile()) {
        out.push(childRel);
      }
    }
  }

  async read(fsPath: string): Promise<RemoteReadResult | undefined> {
    const full = this.resolve(fsPath);
    try {
      const [bytes, stat] = await Promise.all([
        fs.readFile(full),
        fs.stat(full),
      ]);
      return { bytes: new Uint8Array(bytes), stat: toStat(stat) };
    } catch (error) {
      if (
        isErrnoException(error, 'ENOENT') ||
        isErrnoException(error, 'EISDIR')
      ) {
        return undefined;
      }
      throw error;
    }
  }

  async stat(fsPath: string): Promise<RemoteFileStat | undefined> {
    const full = this.resolve(fsPath);
    try {
      const stat = await fs.stat(full);
      if (!stat.isFile()) {
        return undefined;
      }
      return toStat(stat);
    } catch (error) {
      if (isErrnoException(error, 'ENOENT')) {
        return undefined;
      }
      throw error;
    }
  }

  async create(fsPath: string, bytes: Uint8Array): Promise<void> {
    const full = this.resolve(fsPath);
    await fs.mkdir(path.dirname(full), { recursive: true });
    try {
      // `wx` fails if the path already exists — atomic create-if-absent.
      await fs.writeFile(full, bytes, { flag: 'wx' });
    } catch (error) {
      if (isErrnoException(error, 'EEXIST')) {
        throw new RemoteFileError(
          'already-exists',
          `File already exists: ${fsPath}`,
        );
      }
      throw error;
    }
  }

  async write(fsPath: string, bytes: Uint8Array): Promise<void> {
    const full = this.resolve(fsPath);

    // Preserve the "write requires an existing file" contract.
    let stat: Awaited<ReturnType<typeof fs.stat>>;
    try {
      stat = await fs.stat(full);
    } catch (error) {
      if (isErrnoException(error, 'ENOENT')) {
        throw new RemoteFileError('not-found', `File not found: ${fsPath}`);
      }
      throw error;
    }
    if (!stat.isFile()) {
      throw new RemoteFileError('not-found', `Not a file: ${fsPath}`);
    }

    // Durable write: fully write a sibling temp file, then atomically rename it
    // over the target. A crash/power-loss can never leave the note truncated or
    // empty — the reader sees either the old bytes or the new bytes. The temp is
    // dot-prefixed so a leftover never surfaces in a listing.
    const tmp = path.join(
      path.dirname(full),
      `.${path.basename(full)}.tmp-${process.pid}-${this.tmpCounter++}`,
    );
    try {
      await fs.writeFile(tmp, bytes);
      await fs.rename(tmp, full);
    } catch (error) {
      await fs.rm(tmp, { force: true });
      throw error;
    }
  }

  async delete(fsPath: string): Promise<void> {
    const full = this.resolve(fsPath);
    try {
      await fs.unlink(full);
    } catch (error) {
      if (isErrnoException(error, 'ENOENT')) {
        throw new RemoteFileError('not-found', `File not found: ${fsPath}`);
      }
      throw error;
    }
  }

  async rename(from: string, to: string): Promise<void> {
    const fromFull = this.resolve(from);
    const toFull = this.resolve(to);
    await fs.mkdir(path.dirname(toFull), { recursive: true });
    try {
      await fs.rename(fromFull, toFull);
    } catch (error) {
      if (isErrnoException(error, 'ENOENT')) {
        throw new RemoteFileError('not-found', `File not found: ${from}`);
      }
      throw error;
    }
  }

  async listWorkspaces(): Promise<string[]> {
    const entries = await this.readDirSafe(this.root);
    return entries
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b));
  }
}

function toStat(stat: {
  birthtimeMs: number;
  mtimeMs: number;
}): RemoteFileStat {
  const mtime = Math.round(stat.mtimeMs);
  const birth = Math.round(stat.birthtimeMs);
  return {
    // birthtime is 0 on some filesystems; fall back to mtime.
    ctime: birth > 0 ? birth : mtime,
    mtime,
  };
}
