import { Fzf, byLengthAsc, FzfOptions } from 'fzf';
import {
  filePathToWsPath,
  resolvePath,
  sanitizeFilePath,
  validateWsPath,
} from 'ws-path';
import { useEffect, useState } from 'react';
import { conditionalSuffix, removeMdExtension } from 'utils';

const fzfOpts: FzfOptions<string> = {
  limit: 12,
  selector: (item) => resolvePath(item).filePath,
  tiebreakers: [byLengthAsc],
};

export function useSearch(wsPaths: string[], query: string) {
  const [fzf, updateFzf] = useState(() => new Fzf(wsPaths, fzfOpts));
  useEffect(() => {
    updateFzf(new Fzf(wsPaths, fzfOpts));
  }, [wsPaths]);

  return query ? fzf.find(query) : [];
}

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
