import type { DBSchema } from 'idb';
import * as idb from 'idb';

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

function catchUpstream<T>(idbPromise: Promise<T>, errorMessage: string) {
  return idbPromise.catch((error) => {
    return Promise.reject(
      new IndexedDBFileSystemError({
        message: errorMessage,
        code: UPSTREAM_ERROR,
      }),
    );
  });
}

// We are stuck with this name because of legacy reasons.
const metadataDbName = 'baby-idb-meta-3';
const metadataTableName = 'baby-idb-meta-store3';

export interface FileMetadataSchema extends DBSchema {
  [metadataTableName]: {
    key: string;
    value: BaseFileMetadata;
  };
}

class FileMetadata {
  private _db = () => {
    return idb.openDB<FileMetadataSchema>(metadataDbName, 1, {
      upgrade(db, oldVersion) {
        switch (oldVersion) {
          case 0: {
            db.createObjectStore(metadataTableName);
          }
        }
      },
    });
  };

  // get the metadata, if not exists
  async del(filePath: string) {
    await catchUpstream(
      this._db().then((db) => db.delete(metadataTableName, filePath)),
      'Error deleting metadata',
    );
  }

  // save the given `fallback` and return it
  async get(
    filePath: string,
    fallback: BaseFileMetadata,
  ): Promise<BaseFileMetadata> {
    const result = await catchUpstream(
      this._db().then((db) => db.get(metadataTableName, filePath)),
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
      this._db().then((db) => db.put(metadataTableName, metadata, filePath)),
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
}
// We are stuck with this name because of legacy reasons.
const indexedDBFileSystemDbName = 'baby-idb-db-3';
const indexedDBFileSystemTableName = 'baby-idb-db-store-3';

export interface IndexedDBFileSystemSchema extends DBSchema {
  [indexedDBFileSystemTableName]: {
    key: string;
    value: File;
  };
}

export class IndexedDBFileSystem extends BaseFileSystem {
  protected _allowedFile = (file: { name: string }) => true;

  private _db = () => {
    return idb.openDB<IndexedDBFileSystemSchema>(indexedDBFileSystemDbName, 1, {
      upgrade(db, oldVersion) {
        if (!db.objectStoreNames.contains(indexedDBFileSystemTableName)) {
          db.createObjectStore(indexedDBFileSystemTableName);
        }
      },
    });
  };

  protected _fileMetadata: FileMetadata;

  constructor(opts: { allowedFile?: (f: { name: string }) => boolean } = {}) {
    super({
      allowedFile: opts.allowedFile,
      // TODO: implement this
      allowedDir: () => true,
    });

    if (opts.allowedFile) {
      this._allowedFile = opts.allowedFile;
    }

    this._fileMetadata = new FileMetadata();
  }

  async opendirRecursive(dirPath: string) {
    if (!dirPath) {
      throw new Error('dirPath must be defined');
    }
    let keys = await catchUpstream(
      this._db().then((db) => db.getAllKeys(indexedDBFileSystemTableName)),
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

  async readFile(filePath: string): Promise<File> {
    this._verifyFilePath(filePath);

    let result = await catchUpstream(
      this._db().then((db) => db.get(indexedDBFileSystemTableName, filePath)),
      'Error reading data',
    );

    if (result == null) {
      throw new IndexedDBFileSystemError({
        message: `File "${filePath}" not found`,
        code: FILE_NOT_FOUND_ERROR,
      });
    }

    return result;
  }

  async readFileAsText(filePath: string): Promise<string> {
    this._verifyFilePath(filePath);

    const file = await this.readFile(filePath);
    const textContent = await readFileAsTextHelper(file);

    return textContent;
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
      throw new IndexedDBFileSystemError({
        message: `Cannot rename; File "${oldFilePath}" already exists`,
        code: FILE_ALREADY_EXISTS_ERROR,
      });
    }
    await this.writeFile(newFilePath, file);
    await this.unlink(oldFilePath);
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

  async unlink(filePath: string) {
    this._verifyFilePath(filePath);

    await catchUpstream(
      this._db().then((db) =>
        db.delete(indexedDBFileSystemTableName, filePath),
      ),
      'Error deleting file',
    );
    await this._fileMetadata.del(filePath);
  }

  async writeFile(filePath: string, data: File) {
    this._verifyFilePath(filePath);
    this._verifyFileType(data);
    const prom = this._db().then((db) =>
      db.put(indexedDBFileSystemTableName, data, filePath),
    );

    await catchUpstream(prom, 'Error writing data');
    await this._fileMetadata.set(filePath, new BaseFileMetadata());
  }
}

export class IndexedDBFileSystemError extends BaseFileSystemError {}

function isArrayOfStrings(arr: any): arr is string[] {
  if (!Array.isArray(arr)) {
    return false;
  }

  if (!arr.every((elem) => typeof elem === 'string')) {
    return false;
  }

  return true;
}
