// Note: pathname in this file refers to the one used in window.location.pathname
import { pathToRegexp } from 'path-to-regexp';
import makeMatcher from 'wouter/matcher';

import { resolvePath } from './helpers';
import type { Location, OpenedWsPaths } from './opened-ws-paths';

const convertPathToRegexp = (path) => {
  let keys = [];
  // we use original pathToRegexp package here with keys
  const regexp = pathToRegexp(path, keys, { strict: true, end: false });
  return { keys, regexp };
};

export const pathMatcher = makeMatcher(convertPathToRegexp);

export function wsPathToPathname(wsPath: string) {
  let { wsName, filePath } = resolvePath(wsPath);

  wsName = encodeURIComponent(wsName);
  filePath = filePath
    .split('/')
    .map((f) => encodeURIComponent(f))
    .join('/');

  return `/ws/${wsName}/${filePath}`;
}

export function pathnameToWsPath(pathname?: string) {
  if (!pathname) {
    return undefined;
  }

  const wsName = pathnameToWsName(pathname);
  if (!wsName) {
    return undefined;
  }
  let result = pathname
    .split('/')
    .slice(3)
    .map((r) => decodeURIComponent(r))
    .join('/');

  if (result.length === 0) {
    return undefined;
  }
  return `${wsName}:${result}`;
}

export function wsNameToPathname(wsName: string) {
  return `/ws/${encodeURIComponent(wsName)}`;
}

export function pathnameToWsName(pathname?: string): string | undefined {
  if (!pathname) {
    return undefined;
  }

  const [isMatched, match] = pathMatcher('/ws/:wsName', pathname);

  if (isMatched) {
    const { wsName } = match;
    return decodeURIComponent(wsName);
  }

  return undefined;
}

export function wsPathToSearch(wsPath: string, search: string) {
  const newSearch = new URLSearchParams(search);
  newSearch.set('secondary', encodeURIComponent(wsPath));
  return newSearch.toString();
}

export function searchToWsPath(search?: string) {
  if (!search) {
    return undefined;
  }

  const newSearch = new URLSearchParams(search);
  const res = newSearch.get('secondary');
  if (res) {
    return decodeURIComponent(res);
  }
  return undefined;
}

/**
 * sets a set of wsPaths to the location.
 */
export function locationSetWsPath(
  location: Location,
  wsName: string,
  openedWsPaths: OpenedWsPaths,
) {
  let pathname = location.pathname;
  let search = location.search || '';

  if (openedWsPaths.primaryWsPath) {
    pathname = wsPathToPathname(openedWsPaths.primaryWsPath);
  } else {
    pathname = wsNameToPathname(wsName);
  }

  if (openedWsPaths.secondaryWsPath) {
    search = wsPathToSearch(openedWsPaths.secondaryWsPath, search);
  } else {
    const newSearch = new URLSearchParams(location.search);
    newSearch.delete('secondary');
    search = newSearch.toString();
  }

  return { pathname, search };
}
