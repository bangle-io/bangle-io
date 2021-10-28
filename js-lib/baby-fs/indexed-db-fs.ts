import * as idb from 'idb-keyval';

import {
  BaseFileMetadata,
  BaseFileSystem,
  BaseFileSystemError,
} from './base-fs';
import {
  FILE_ALREADY_EXISTS_ERROR,
  FILE_NOT_FOUND_ERROR,
  UPSTREAM_ERROR,
} from './error-codes';
import { readFileAsText as readFileAsTextHelper } from './native-browser-fs-helpers';

const idbSuffix = 3;
export const BASE_IDB_NAME_PREFIX = 'baby-idb';

function catchUpstream(idbPromise, errorMessage) {
  return idbPromise.catch((error) => {
    return Promise.reject(
      new IndexedDBFileSystemError(errorMessage, UPSTREAM_ERROR, null, error),
    );
  });
}

class FileMetadata {
  private _customMetaStore: ReturnType<typeof idb.createStore>;

  constructor() {
    this._customMetaStore = idb.createStore(
      `${BASE_IDB_NAME_PREFIX}-meta-${idbSuffix}`,
      `${BASE_IDB_NAME_PREFIX}-meta-store${idbSuffix}`,
    );
  }
  // get the metadata, if not exists
  // save the given `fallback` and return it
  async get(
    filePath: string,
    fallback: BaseFileMetadata,
  ): Promise<BaseFileMetadata> {
    const result = await catchUpstream(
      idb.get(filePath, this._customMetaStore),
      'Error reading metadata',
    );

    if (result == null) {
      await this.set(filePath, fallback);
      return fallback;
    }
    return result;
  }

  async set(filePath: string, metadata: BaseFileMetadata) {
    await catchUpstream(
      idb.set(filePath, metadata, this._customMetaStore),
      'Error writing metadata',
    );
  }

  async update(
    filePath: string,
    fallback: BaseFileMetadata,
    cb: (r: BaseFileMetadata) => BaseFileMetadata,
  ) {
    const existing = await this.get(filePath, fallback);
    const metadata = cb(existing);
    await this.set(filePath, metadata);
  }

  async del(filePath: string) {
    await catchUpstream(
      idb.del(filePath, this._customMetaStore),
      'Error deleting metadata',
    );
  }
}

export class IndexedDBFileSystem extends BaseFileSystem {
  protected _allowedFile: (f: string) => boolean;
  protected _customStore: ReturnType<typeof idb.createStore>;
  protected _fileMetadata: FileMetadata;

  constructor(opts: { allowedFile?: (f: string) => boolean } = {}) {
    super();
    this._allowedFile = opts.allowedFile ?? ((filePath) => true);
    this._customStore = idb.createStore(
      `${BASE_IDB_NAME_PREFIX}-db-${idbSuffix}`,
      `${BASE_IDB_NAME_PREFIX}-db-store-${idbSuffix}`,
    );

    this._fileMetadata = new FileMetadata();
  }

  async stat(filePath: string) {
    this._verifyFilePath(filePath);
    // read file so that if there is an error we throw it
    await this.readFile(filePath);
    const result = await this._fileMetadata.get(
      filePath,
      new BaseFileMetadata(),
    );
    return result;
  }

  async readFileAsText(filePath: string): Promise<string> {
    this._verifyFilePath(filePath);

    const file = await this.readFile(filePath);
    const textContent = await readFileAsTextHelper(file);
    return textContent;
  }

  async readFile(filePath: string) {
    this._verifyFilePath(filePath);

    let result = await catchUpstream(
      idb.get(filePath, this._customStore),
      'Error reading data',
    );

    if (result == null) {
      throw new IndexedDBFileSystemError(
        `File ${filePath} not found`,
        FILE_NOT_FOUND_ERROR,
        `File ${filePath} not found`,
      );
    }

    return result;
  }

  async writeFile(filePath: string, data: File) {
    this._verifyFilePath(filePath);
    this._verifyFileType(data);
    await catchUpstream(
      idb.set(filePath, data, this._customStore),
      'Error writing data',
    );
    await this._fileMetadata.update(filePath, new BaseFileMetadata(), () => {
      return new BaseFileMetadata();
    });
  }

  async unlink(filePath: string) {
    this._verifyFilePath(filePath);

    await catchUpstream(
      idb.del(filePath, this._customStore),
      'Error deleting file',
    );
    await this._fileMetadata.del(filePath);
  }

  async rename(oldFilePath: string, newFilePath: string) {
    this._verifyFilePath(oldFilePath);
    this._verifyFilePath(newFilePath);

    const file = await this.readFile(oldFilePath);
    let existingFile;
    try {
      existingFile = await this.readFile(newFilePath);
    } catch (error) {
      if (!(error instanceof BaseFileSystemError)) {
        throw error;
      }
      if (error.code !== FILE_NOT_FOUND_ERROR) {
        throw error;
      }
    }

    if (existingFile) {
      throw new IndexedDBFileSystemError(
        'File already exists',
        FILE_ALREADY_EXISTS_ERROR,
        'Cannot rename as a file with the same name already exists',
      );
    }
    await this.writeFile(newFilePath, file);
    await this.unlink(oldFilePath);
  }

  async opendirRecursive(dirPath: string) {
    if (!dirPath) {
      throw new Error('dirPath must be defined');
    }
    let keys = await catchUpstream(
      idb.keys(this._customStore),
      'Error listing files',
    );
    if (keys == null) {
      keys = [];
    }
    if (!isArrayOfStrings(keys)) {
      throw new Error('Keys in opendirRecursive must be array');
    }

    if (dirPath && !dirPath.endsWith('/')) {
      dirPath += '/';
    }

    const result = dirPath ? keys.filter((k) => k.startsWith(dirPath)) : keys;
    return result;
  }
}

export class IndexedDBFileSystemError extends BaseFileSystemError {}

function isArrayOfStrings(arr: any): arr is Array<string> {
  if (!Array.isArray(arr)) {
    return false;
  }

  if (!arr.every((elem) => typeof elem === 'string')) {
    return false;
  }

  return true;
}
