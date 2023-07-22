import {
  filePathToWsPath,
  removeExtension,
  resolvePath,
  sanitizeFilePath,
  suffixWithNoteExtension,
  validateWsPath,
} from '@bangle.io/ws-path';

export function wsPathFromQuery(query: string, wsName: string) {
  let filePath = query.split(']]').join('');
  filePath = filePath.trim();
  filePath = suffixWithNoteExtension(filePath);
  let wsPath = filePathToWsPath(wsName, filePath);
  try {
    validateWsPath(wsPath);
  } catch (error) {
    wsPath = filePathToWsPath(wsName, sanitizeFilePath(filePath));
  }

  return wsPath;
}

export function getBacklinkPath(wsPath: string, allWsPaths: readonly string[]) {
  const { fileName, filePath } = resolvePath(wsPath);
  const matchingFilenames = allWsPaths.filter(
    (w) => resolvePath(w).fileName === fileName,
  );

  if (matchingFilenames.length === 0) {
    return removeExtension(filePath);
  }

  // if there are multiple files with the same name
  // give it an absolute path
  if (matchingFilenames.length > 1) {
    return removeExtension(filePath);
  }

  return removeExtension(fileName);
}
