// based on node's stat

import { BaseError } from 'utils/index';

// ctimeMs is not supported by native browser fs, so only focusing on mTime
export class BaseFileMetadata {
  constructor({ mtimeMs = new Date().getTime() } = {}) {
    this.mtimeMs = mtimeMs;
  }
}

// Assumptions
// - a path with `.` extension is a file
// - a path with no `.` is a directory
export class BaseFileSystem {
  async stat(filePath) {}
  // should return a string
  async readFileAsText(filePath) {}
  //  https://github.com/jprichardson/node-fs-extra/blob/master/docs/outputFile.md
  // Almost the same as fs.writeFile (i.e. it overwrites), except that if the parent directory does not exist, it's created
  // and date must be a string type
  async writeFileAsText(filePath, data) {}
  async unlink(filePath) {}
  // Rename a file or directory
  async rename() {}
  // should return an async iterator of kids inside it
  /// see https://nodejs.org/api/fs.html#fs_class_fs_dir
  async opendirRecursive(dirPath) {}

  // TODO
  // Ensures that the directory exists. If the directory structure does not exist, it is created.
  async mkdirp(filePath) {}

  //Remove directory
  async rmdir() {}

  // fs.extra https://github.com/jprichardson/node-fs-extra/blob/master/docs/move.md
  async move(src, dest) {}

  // https://github.com/jprichardson/node-fs-extra/blob/master/docs/copy.md
  // Copy a file or directory. The directory can have contents.
  async copy() {}
}

export class BaseFileSystemError extends BaseError {}
