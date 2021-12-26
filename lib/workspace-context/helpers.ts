import {
  filePathToWsPath,
  getWsNameFromPathname,
  isValidNoteWsPath,
  OpenedWsPaths,
  resolvePath,
} from '@bangle.io/ws-path';

export function getPrimaryFilePath(pathname?: string) {
  if (pathname) {
    return pathname.split('/').slice(3).join('/');
  }
  return undefined;
}

export function getPrimaryWsPath(pathname?: string) {
  const wsName = getWsNameFromPathname(pathname);
  const filePath = getPrimaryFilePath(pathname);
  if (!wsName || !filePath) {
    return undefined;
  }
  return filePathToWsPath(wsName, filePath);
}

export function getSecondaryWsPath(search?: string) {
  const searchParams = new URLSearchParams(search);
  const secondaryWsPath = searchParams.get('secondary') ?? undefined;

  return secondaryWsPath;
}

export function wsPathToPathname(wsPath: string) {
  const { wsName, filePath } = resolvePath(wsPath);
  return encodeURI(`/ws/${wsName}/${filePath}`);
}

export function wsNameToPathname(wsName: string) {
  return encodeURI(`/ws/${wsName}`);
}

export function validateOpenedWsPaths(openedWsPath: OpenedWsPaths):
  | {
      valid: true;
    }
  | {
      invalidWsPath: string;
      valid: false;
    } {
  let invalidWsPath: string | undefined = undefined;

  openedWsPath.forEachWsPath((path) => {
    if (invalidWsPath || path == null) {
      return;
    }

    if (!isValidNoteWsPath(path)) {
      invalidWsPath = path;
    }
  });

  if (invalidWsPath) {
    return { valid: false, invalidWsPath: invalidWsPath };
  }

  return {
    valid: true,
  };
}

export const findInvalidLocation = (
  locationPathname?: string,
  locationSearchQuery?: string,
) => {
  // primary
  if (locationPathname && locationPathname.length > 0) {
    const primaryWsPath = getPrimaryWsPath(locationPathname);
    if (primaryWsPath && !isValidNoteWsPath(primaryWsPath)) {
      return primaryWsPath;
    }
  }

  // secondary
  if (locationSearchQuery) {
    const secondaryWsPath = getSecondaryWsPath(locationSearchQuery);
    if (secondaryWsPath && !isValidNoteWsPath(secondaryWsPath)) {
      return secondaryWsPath;
    }

    // since there can be other things in the search query we can not
    // mark the whole thing as invalid
  }

  return undefined;
};
