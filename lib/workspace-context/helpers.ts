import { filePathToWsPath, matchPath } from '@bangle.io/ws-path';

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

export function getWsNameFromPathname(pathname?: string) {
  if (!pathname) {
    return undefined;
  }

  const match = matchPath<{ wsName: string }>(pathname, {
    path: '/ws/:wsName',
    exact: false,
    strict: false,
  });

  const { wsName } = match?.params ?? {};

  return wsName;
}
