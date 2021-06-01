import { BaseFileSystemError } from './base-fs';
import {
  FILE_NOT_FOUND_ERROR,
  NOT_ALLOWED_ERROR,
  UPSTREAM_ERROR,
  VALIDATION_ERROR,
} from './error-codes';
import { IndexedDBFileSystem, IndexedDBFileSystemError } from './indexed-db-fs';
import { readFileAsText as readFileAsTextHelper } from './native-browser-fs-helpers';

function defaultHelpers(helpDocsVersion) {
  if (!helpDocsVersion) {
    throw new Error('helpDocsVersion is needed');
  }

  function readFileFromUnpkg(filePath) {
    const splitted = filePath.split('/');
    const [wsName, ...path] = splitted;

    return fetchHelpFiles(path.join('/'))
      .then((r) => r?.blob())
      .then((r) => {
        if (!r) {
          return undefined;
        }
        const name = splitted[splitted.length - 1];
        const file = new File([r], name);
        return file;
      });
  }

  function listFilesFromUnpkg(dirPath) {
    // we follow a convention of storing all the files in this location
    return fetchHelpFiles('.bangle/files.json', true)
      .then((result) => {
        if (!result) {
          throw new HelpFileSystemError(
            'Unable to load help files.json',
            UPSTREAM_ERROR,
          );
        }
        return result.json();
      })
      .then((result) => result.files);
  }

  function fetchHelpFiles(path, json = false) {
    return fetch(
      `https://unpkg.com/bangle-io-help@${helpDocsVersion}/docs/` + path,
    ).then((r) => {
      if (!r.ok) {
        if (r.status === 404) {
          return null;
        }
        return Promise.reject(
          new HelpFileSystemError(
            `Encountered an error making request to unpkg.com ${r.status} ${r.statusText}`,
            UPSTREAM_ERROR,
          ),
        );
      }
      return r;
    });
  }
  return {
    readFileFromUnpkg,
    listFilesFromUnpkg,
  };
}

/**
 * A file system geared towards the internal use of displaying
 * help files.
 */
export class HelpFileSystem extends IndexedDBFileSystem {
  constructor(opts) {
    super(opts);
    this._allowedFile = opts.allowedFile ?? ((filePath) => () => true);
    const { readFileFromUnpkg, listFilesFromUnpkg } = defaultHelpers(
      opts.helpDocsVersion,
    );
    // if allowLocalChanges is true, this will not be called if
    // a matching file exists locally
    // return null if a file is not found.
    this._readFile = opts.readFile ?? readFileFromUnpkg;
    this._listFiles = opts.listFiles ?? listFilesFromUnpkg;
    // whether to allow certain indexedb persistence operation like saving a file in indexeddb
    this._allowLocalChanges = opts.allowLocalChanges ?? true;
  }

  async _readFromLocal(filePath) {
    return super.readFile(filePath).catch((error) => {
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

  async readFileAsText(filePath) {
    const file = await this.readFile(filePath);
    const result = await readFileAsTextHelper(file);

    return result;
  }

  async readFile(filePath) {
    let result;
    if (this._allowLocalChanges) {
      result = await this._readFromLocal(filePath);
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
    if (this._allowLocalChanges) {
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
    const localFiles = this._allowLocalChanges
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

    const result = Array.from(new Set([...remoteData, ...localFiles])).filter(
      (filePath) => this._allowedFile(filePath),
    );

    return result;
  }

  // miscellaneous function
  // check if a help file has modifications (existence of a local file indicates it)
  async isFileModified(filePath, compareWithBlob) {
    const localFile = await this._readFromLocal(filePath);
    if (localFile) {
      return true;
    }

    const actualFile = await this._readFile(filePath);
    if (!actualFile) {
      return true;
    }

    if (compareWithBlob) {
      const actualFileText = await readFileAsTextHelper(actualFile);
      const compareWithText = await readFileAsTextHelper(compareWithBlob);

      return actualFileText !== compareWithText;
    }

    return false;
  }
}

export class HelpFileSystemError extends IndexedDBFileSystemError {}
