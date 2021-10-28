// based on node's stat

import { BaseError } from '@bangle.io/base-error';

import { VALIDATION_ERROR } from './error-codes';

// ctimeMs is not supported by native browser fs, so only focusing on mTime
export class BaseFileMetadata {
  public mtimeMs: number;
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
  _verifyFileType(file) {
    if (!(file instanceof File)) {
      throw new BaseFileSystemError(
        'Provided data is not of File type',
        VALIDATION_ERROR,
      );
    }
  }

  _verifyFilePath(filePath: string) {
    if (filePath.startsWith('/')) {
      throw new BaseFileSystemError(
        'filePath must not start with /',
        VALIDATION_ERROR,
      );
    }
  }

  abstract stat(filePath: string): Promise<BaseFileMetadata>;
  // should return a string
  abstract readFileAsText(filePath: string): Promise<string>;
  //  https://github.com/jprichardson/node-fs-extra/blob/master/docs/outputFile.md
  // Almost the same as fs.writeFile (i.e. it overwrites), except that if the parent directory does not exist, it's created
  // and date must be a string type
  //!! data - has to a blob
  abstract writeFile(filePath: string, data: File): Promise<void>;
  abstract unlink(filePath: string): Promise<void>;
  // Rename a file or directory
  abstract rename(oldFilePath: string, newFilePath: string): Promise<void>;
  // should return an async iterator of kids inside it
  /// see https://nodejs.org/api/fs.html#fs_class_fs_dir
  // recrusively list all files paths under the rootPath
  // in the example below the dirPath is `w`, almost always `w` is
  // the wsName.
  // return value ['w/b/c.md', 'w/e.md']
  // for a dirPath= `foo/bar`, internally will filter all paths starting with `foo/bar/`
  abstract opendirRecursive(dirPath: string): Promise<string[]>;

  // TODO
  // Ensures that the directory exists. If the directory structure does not exist, it is created.
  async mkdirp(filePath) {}

  //Remove directory
  async rmdir(): Promise<void> {}

  // fs.extra https://github.com/jprichardson/node-fs-extra/blob/master/docs/move.md
  async move(src, dest) {}

  // https://github.com/jprichardson/node-fs-extra/blob/master/docs/copy.md
  // Copy a file or directory. The directory can have contents.
  async copy() {}
}

export class BaseFileSystemError extends BaseError {}
