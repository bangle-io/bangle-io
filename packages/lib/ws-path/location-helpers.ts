// Note: pathname in this file refers to the one used in window.location.pathname
import type { Key } from 'path-to-regexp';
import { pathToRegexp } from 'path-to-regexp';
// eslint-disable-next-line import/default
import makeMatcher from 'wouter/matcher';

import { WS_PAGES_ROOT } from '@bangle.io/constants';
import { weakCache } from '@bangle.io/mini-js-utils';
import type { Location } from '@bangle.io/shared-types';

import { isValidNoteWsPath, resolvePath } from './helpers';
import type { OpenedWsPaths } from './opened-ws-paths';

type WsPath = string;

export function goToWorkspaceSelection(location: Location): Location {
  const newSearch = new URLSearchParams(location.search);
  newSearch.delete('secondary');
  const search = newSearch.toString();

  return { pathname: '/' + WS_PAGES_ROOT.workspacesSelection, search };
}

export const convertPathToRegexp = (path: string) => {
  let keys: Key[] = [];
  // we use original pathToRegexp package here with keys
  const regexp = pathToRegexp(path, keys, { strict: true, end: false });

  return { keys, regexp };
};

export const pathMatcher = makeMatcher(convertPathToRegexp);

export function wsPathToPathname(wsPath: WsPath) {
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

export function getWsName(location: Location) {
  return pathnameToWsName(location.pathname);
}

export function pathnameToWsName(pathname?: string): string | undefined {
  if (!pathname) {
    return undefined;
  }

  const [isMatched, match] = pathMatcher('/ws/:wsName', pathname);

  if (isMatched) {
    const { wsName } = match;
    if (typeof wsName === 'string') {
      return decodeURIComponent(wsName);
    }
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

export const getPrimaryWsPath = weakCache((location: Location) => {
  const primary = pathnameToWsPath(location.pathname);

  if (!isValidNoteWsPath(primary)) {
    return undefined;
  }

  return primary;
});

export const getSecondaryWsPath = weakCache((location: Location) => {
  const secondary = searchToWsPath(location.search);

  if (!isValidNoteWsPath(secondary)) {
    return undefined;
  }

  return secondary;
});

/**
 * sets a set of wsPaths to the location.
 */
export function locationSetWsPath(
  location: Location,
  wsName: string,
  openedWsPaths: OpenedWsPaths,
) {
  let pathname = location.pathname;
  let search = location.search ?? '';

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
