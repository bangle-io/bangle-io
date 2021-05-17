import { BaseFileSystemError } from './base-fs';
import {
  FILE_NOT_FOUND_ERROR,
  NOT_ALLOWED_ERROR,
  VALIDATION_ERROR,
} from './error-codes';
import { IndexedDBFileSystem, IndexedDBFileSystemError } from './indexed-db-fs';
import { readFileAsText as readFileAsTextHelper } from './native-browser-fs-helpers';

/**
 * A file system geared towards the internal use of displaying
 * help files.
 */
export class HelpFileSystem extends IndexedDBFileSystem {
  constructor(opts) {
    super(opts);
    this._allowedFile = opts.allowedFile ?? ((filePath) => () => true);
    // if localFallback is true, this will not be called if
    // a matching file exists locally
    // return null if a file is not found.
    this._readFile = opts.readFile;
    // whether to allow certain indexedb persistence operation like saving a file in indexeddb
    this._localFallback = opts.localFallback ?? true;
    // Returns list of all available files
    // in the format `a/b/c` where a is the direct child subdir
    // of a workspace named `w`.
    // NOTE: this is different from the format of what `opendirRecursive`
    // returns.
    this._listFiles = opts.listFiles;
  }

  async readFileAsText(filePath) {
    const file = await this.readFile(filePath);
    const result = await readFileAsTextHelper(file);

    return result;
  }

  async readFile(filePath) {
    let result;
    if (this._localFallback) {
      result = await super.readFile(filePath).catch((error) => {
        if (
          error instanceof BaseFileSystemError &&
          error.code === FILE_NOT_FOUND_ERROR
        ) {
          return;
        } else {
          throw error;
        }
      });
    }

    if (!result) {
      result = await this._readFile(filePath);
      if (!result) {
        throw new HelpFileSystemError(
          `File ${filePath} not found`,
          FILE_NOT_FOUND_ERROR,
          `File ${filePath} not found`,
        );
      }
    }

    return result;
  }

  async writeFile(filePath, data) {
    if (this._localFallback) {
      return super.writeFile(filePath, data);
    }

    throw new HelpFileSystemError(
      `Writing not allowed`,
      // TODO handle this error
      NOT_ALLOWED_ERROR,
      `Help files cannot be written`,
    );
  }

  async rename(oldFilePath, newFilePath) {
    throw new HelpFileSystemError(
      `Rename not allowed`,
      // TODO handle this error
      NOT_ALLOWED_ERROR,
      `Help files cannot be renamed`,
    );
  }

  async opendirRecursive(dirPath) {
    // this is the wsName and all paths are returned
    // starting with their wsName
    const [prefix] = dirPath.split('/');
    const localFiles = this._localFallback
      ? await super.opendirRecursive(dirPath)
      : [];

    let remoteData = await this._listFiles(dirPath);

    if (remoteData.some((file) => file.startsWith('/'))) {
      throw new HelpFileSystemError(
        'Paths must not start with /',
        VALIDATION_ERROR,
      );
    }
    remoteData = remoteData.map((r) => prefix + '/' + r);

    const result = Array.from(
      new Set([...remoteData, ...localFiles]),
    ).filter((filePath) => this._allowedFile(filePath));

    return result;
  }
}

export class HelpFileSystemError extends IndexedDBFileSystemError {}
