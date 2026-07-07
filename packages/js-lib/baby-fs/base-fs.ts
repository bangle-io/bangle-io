/* eslint-disable @typescript-eslint/no-empty-function */
// based on node's stat

import { BaseError } from '@bangle.io/mini-js-utils';

// ctimeMs is not supported by native browser fs, so only focusing on mTime
export class BaseFileMetadata {
  mtimeMs: number;
  constructor({ mtimeMs = Date.now() } = {}) {
    this.mtimeMs = mtimeMs;
  }
}

// can look into https://github.com/fagbokforlaget/simple-fs/tree/master/src/filesystem
// for inspiration of node style api for fs in browser
// Assumptions
// - a path with `.` extension is a file
// - a path with no `.` is a directory
export abstract class BaseFileSystem {
  constructor(
    protected opts: {
      allowedFile?: (f: { name: string }) => boolean;
      allowedDir?: (entry: { name: string }) => boolean;
    },
  ) {}

  // Copy a file or directory. The directory can have contents.
  async copy() {}
  // Ensures that the directory exists. If the directory structure does not exist, it is created.
  async mkdirp(_filePath: string) {}
  // fs.extra https://github.com/jprichardson/node-fs-extra/blob/master/docs/move.md
  async move(_src: string, _dest: string) {}
  // for a dirPath= `foo/bar`, internally will filter all paths starting with `foo/bar/`
  // abortSignal (when provided) lets a long-running recursive traversal be
  // interrupted early instead of running to completion after the caller has
  // stopped caring about the result.
  abstract opendirRecursive(
    dirPath: string,
    abortSignal?: AbortSignal,
  ): Promise<string[]>;
  // should return a File
  abstract readFile(filePath: string): Promise<File>;
  // should return a string
  abstract readFileAsText(filePath: string): Promise<string>;
  // Rename a file or directory
  abstract rename(oldFilePath: string, newFilePath: string): Promise<void>;
  //Remove directory
  async rmdir(): Promise<void> {}
  abstract stat(filePath: string): Promise<BaseFileMetadata>;

  // Create a file and reject if the target already exists.
  abstract createFile(filePath: string, data: File): Promise<void>;
  // and date must be a string type
  abstract unlink(filePath: string): Promise<void>;
  //!! data - has to a blob
  abstract writeFile(filePath: string, data: File): Promise<void>;

  _verifyFilePath(filePath: string) {
    if (filePath.startsWith('/')) {
      throw Error('BabyFs: filePath must not start with /');
    }
  }

  /**
   * Rename is implemented as copy-then-delete in the browser backends. Before
   * the source file is deleted, the destination must be read back and match
   * the source, otherwise a partial or failed write would turn a rename into
   * data loss. On verification failure the source file is kept and the caller
   * receives the returned error; the destination may hold a partial copy that
   * is safe to overwrite on retry.
   */
  protected async _verifyRenameDestination(
    newFilePath: string,
    sourceFile: File,
    makeError: (opts: { message: string; cause?: unknown }) => Error,
  ): Promise<void> {
    let destination: File;
    try {
      destination = await this.readFile(newFilePath);
    } catch (cause) {
      throw makeError({
        message: `Rename aborted: could not read back "${newFilePath}" after writing it. The original file was kept.`,
        cause,
      });
    }
    // Compare the actual bytes read back, not File.size: storage backends can
    // return reconstructed File objects whose size metadata is not
    // trustworthy, and a same-length corrupt write must also keep the source.
    // Memory note: the source File is already fully in memory (rename reads
    // it before copying), so this comparison does not change the peak beyond
    // what copy-then-delete already requires.
    const [destinationBytes, sourceBytes] = await Promise.all([
      destination.arrayBuffer(),
      sourceFile.arrayBuffer(),
    ]);
    if (destinationBytes.byteLength !== sourceBytes.byteLength) {
      throw makeError({
        message: `Rename aborted: "${newFilePath}" was written incompletely (${destinationBytes.byteLength} of ${sourceBytes.byteLength} bytes). The original file was kept.`,
      });
    }
    const destinationView = new Uint8Array(destinationBytes);
    const sourceView = new Uint8Array(sourceBytes);
    for (let index = 0; index < sourceView.length; index++) {
      if (destinationView[index] !== sourceView[index]) {
        throw makeError({
          message: `Rename aborted: "${newFilePath}" does not match the source content after writing. The original file was kept.`,
        });
      }
    }
  }

  _verifyFileType(file: File) {
    if (!(file instanceof File)) {
      throw Error('BabyFs: Provided data is not of File type');
    }
  }

  //  https://github.com/jprichardson/node-fs-extra/blob/master/docs/outputFile.md
  // Almost the same as fs.writeFile (i.e. it overwrites), except that if the parent directory does not exist, it's created

  // should return an async iterator of kids inside it
  /// see https://nodejs.org/api/fs.html#fs_class_fs_dir
  // recrusively list all files paths under the rootPath
  // in the example below the dirPath is `w`, always `w` is
  // the wsName (root dir name).
  // return value ['w/b/c.md', 'w/e.md']

  // TODO

  // https://github.com/jprichardson/node-fs-extra/blob/master/docs/copy.md
}

export class BaseFileSystemError extends BaseError {}
