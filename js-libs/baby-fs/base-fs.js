import * as _idb from 'idb-keyval';

// based on node's stat

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
  constructor(opts) {}
  async stat(filePath) {}
  async readFile(filePath) {}
  //  https://github.com/jprichardson/node-fs-extra/blob/master/docs/outputFile.md
  // Almost the same as fs.writeFile (i.e. it overwrites), except that if the parent directory does not exist, it's created
  async writeFile(filePath, data) {}
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

export class BaseFileSystemError extends Error {
  /**
   *
   * @param {*} message
   * @param {*} code - error code
   * @param {*} displayMessage - one that will be shown to the user, generally a non fatal error
   * @param {*} srcError - if error encapsulates another error
   */
  constructor(message, code, displayMessage, srcError) {
    message = code + ':' + message;
    // 'Error' breaks prototype chain here
    super(message);
    // restore prototype chain
    const actualProto = new.target.prototype;
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(this, actualProto);
    } else {
      this.__proto__ = actualProto;
    }

    if (srcError) {
      console.log('--Source error start--');
      console.error(srcError);
      console.log('--Source error end--');

      this.srcError = srcError;
    }

    if (code) {
      this.code = code;
    }

    this.displayMessage = displayMessage;

    this.name = this.constructor.name;
  }
}
