// based on node's stat

import { BaseError } from '@bangle.io/base-error';

// ctimeMs is not supported by native browser fs, so only focusing on mTime
export class BaseFileMetadata {
  mtimeMs: number;
  constructor({ mtimeMs = new Date().getTime() } = {}) {
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
  async mkdirp(filePath: string) {}
  // fs.extra https://github.com/jprichardson/node-fs-extra/blob/master/docs/move.md
  async move(src: string, dest: string) {}
  // for a dirPath= `foo/bar`, internally will filter all paths starting with `foo/bar/`
  abstract opendirRecursive(dirPath: string): Promise<string[]>;
  // should return a string
  abstract readFileAsText(filePath: string): Promise<string>;
  // Rename a file or directory
  abstract rename(oldFilePath: string, newFilePath: string): Promise<void>;
  //Remove directory
  async rmdir(): Promise<void> {}
  abstract stat(filePath: string): Promise<BaseFileMetadata>;

  // and date must be a string type
  abstract unlink(filePath: string): Promise<void>;
  //!! data - has to a blob
  abstract writeFile(filePath: string, data: File): Promise<void>;

  _verifyFilePath(filePath: string) {
    if (filePath.startsWith('/')) {
      throw Error('BabyFs: filePath must not start with /');
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
