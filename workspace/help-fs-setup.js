import {
  HelpFileSystem,
  BaseFileSystemError,
  FILE_NOT_FOUND_ERROR,
  readFileAsText as readFileAsTextHelper,
} from 'baby-fs';
import { validateNoteWsPath, toFSPath } from './path-helpers';

export function createHelpFS({ allowLocalChanges = true } = {}) {
  return new HelpFileSystem({
    allowLocalChanges: allowLocalChanges,
  });
}

// compare whether the current note is modified w.r.t
// to what is saved in indexeddb or a fileBlob
export async function isNoteModified(wsPath, fileBlob) {
  validateNoteWsPath(wsPath);
  const fsPath = toFSPath(wsPath);

  const readFileAsText = (fs) => {
    return fs.readFileAsText(fsPath).catch((error) => {
      if (
        error instanceof BaseFileSystemError &&
        error.code === FILE_NOT_FOUND_ERROR
      ) {
        return;
      } else {
        throw error;
      }
    });
  };

  const originalFS = createHelpFS({ allowLocalChanges: false });

  const originalFile = trimIfExists(await readFileAsText(originalFS));
  const comparedWithFile = trimIfExists(
    fileBlob
      ? await readFileAsTextHelper(fileBlob)
      : await readFileAsText(createHelpFS()),
  );

  if (originalFile == null && comparedWithFile) {
    return true;
  }

  return originalFile !== comparedWithFile;
}

function trimIfExists(str) {
  return typeof str === 'string' ? str.trim() : str;
}
