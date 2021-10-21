import {
  filePathToWsPath,
  resolvePath,
  sanitizeFilePath,
  validateWsPath,
} from 'ws-path';
import { conditionalSuffix, removeMdExtension } from 'utils';

export function wsPathFromQuery(query, wsName) {
  let filePath = query.split(']]').join('');
  filePath = filePath.trim();
  filePath = conditionalSuffix(filePath, '.md');
  let wsPath = filePathToWsPath(wsName, filePath);
  try {
    validateWsPath(wsPath);
  } catch (error) {
    wsPath = filePathToWsPath(wsName, sanitizeFilePath(filePath));
  }

  return wsPath;
}

export function getBacklinkPath(wsPath, allWsPaths) {
  const { fileName, filePath } = resolvePath(wsPath);
  const matchingFilenames = allWsPaths.filter(
    (w) => resolvePath(w).fileName === fileName,
  );

  if (matchingFilenames.length === 0) {
    return removeMdExtension(filePath);
  }

  // if there are multiple files with the same name
  // give it an absolute path
  if (matchingFilenames.length > 1) {
    return removeMdExtension(filePath);
  }

  return removeMdExtension(fileName);
}
