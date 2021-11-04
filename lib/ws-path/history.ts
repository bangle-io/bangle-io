// import type { History as _History } from 'history';
// eslint-disable-next-line import/no-unresolved
import type { History as _History } from 'history';
import { matchPath } from 'react-router-dom';

import { filePathToWsPath, resolvePath } from './helpers';

type MaybeWsPath = string | undefined | null;

export type Location = _History<any>['location'];
export type History = _History<any>;
/**
 * This exists to keep null and undefined value interchangeable
 */
function compare(a: any, b: any) {
  if (a == null && b == null) {
    return true;
  }
  return a === b;
}
export class OpenedWsPaths {
  constructor(private wsPaths: [MaybeWsPath, MaybeWsPath]) {
    if (wsPaths.length !== 2) {
      throw new Error('Only support two editors opened at a time');
    }
  }
  get primaryWsPath() {
    return this.wsPaths[0] ?? undefined;
  }

  get secondaryWsPath() {
    return this.wsPaths[1] ?? undefined;
  }

  forEachWsPath(cb: (wsPath: string, index: number) => void) {
    this.wsPaths.forEach((p, i) => {
      if (p) {
        cb(p, i);
      }
    });
  }

  updatePrimaryWsPath(wsPath: MaybeWsPath) {
    if (compare(wsPath, this.primaryWsPath)) {
      return this;
    }
    return new OpenedWsPaths([wsPath, this.secondaryWsPath]);
  }

  updateSecondaryWsPath(wsPath: MaybeWsPath) {
    if (compare(wsPath, this.secondaryWsPath)) {
      return this;
    }
    return new OpenedWsPaths([this.primaryWsPath, wsPath]);
  }

  updateAllWsPaths(wsPaths: [MaybeWsPath, MaybeWsPath]) {
    const result = new OpenedWsPaths(wsPaths);
    // avoid changing instance
    if (result.equal(this)) {
      return this;
    }
    return result;
  }

  equal(compareWith: OpenedWsPaths) {
    if (
      compare(this.primaryWsPath, compareWith.primaryWsPath) &&
      compare(this.secondaryWsPath, compareWith.secondaryWsPath)
    ) {
      return true;
    }
    return false;
  }

  getLocation(location: Location, wsName: string) {
    return locationSetWsPath(location, wsName, this);
  }

  /**
   * check if wsPath is in any of the location wspaths
   * @param wsPath
   */
  has(wsPath: MaybeWsPath) {
    if (wsPath == null) {
      return false;
    }
    return this.wsPaths.includes(wsPath);
  }

  /**
   * check if there are any wsPath in this
   */
  hasSomeWsPath() {
    return this.wsPaths.some((r) => {
      return r != null;
    });
  }

  removeIfFound(wsPath: MaybeWsPath): OpenedWsPaths {
    return this.updateIfFound(wsPath, null);
  }

  updateIfFound(
    wsPath: MaybeWsPath,
    replaceWsPath: MaybeWsPath,
  ): OpenedWsPaths {
    let ret: OpenedWsPaths = this;

    if (compare(ret.primaryWsPath, wsPath)) {
      ret = ret.updatePrimaryWsPath(replaceWsPath);
    }
    if (compare(ret.secondaryWsPath, wsPath)) {
      ret = ret.updateSecondaryWsPath(replaceWsPath);
    }

    return ret;
  }
}

export function getWsName(location: Location) {
  const match = matchPath<{ wsName: string }>(location.pathname, {
    path: '/ws/:wsName',
    exact: false,
    strict: false,
  });

  const { wsName } = match?.params ?? {};

  return wsName;
}

function getPrimaryFilePath(location: Location) {
  if (location) {
    return location.pathname.split('/').slice(3).join('/');
  }
  return null;
}

export function getPrimaryWsPath(location: Location) {
  const wsName = getWsName(location);
  const filePath = getPrimaryFilePath(location);
  if (!wsName || !filePath) {
    return undefined;
  }
  return filePathToWsPath(wsName, filePath);
}

export function getSecondaryWsPath(location: Location) {
  const search = new URLSearchParams(location?.search);
  const secondaryWsPath = search.get('secondary') ?? undefined;

  return secondaryWsPath;
}

/**
 * sets a set of wsPaths to the location.
 * @param location
 * @param openedWsPaths
 * @param param2
 * @returns
 */
function locationSetWsPath(
  location: Location,
  wsName,
  openedWsPaths: OpenedWsPaths,
) {
  if (openedWsPaths.primaryWsPath) {
    const { wsName, filePath } = resolvePath(openedWsPaths.primaryWsPath);
    const newPath = encodeURI(`/ws/${wsName}/${filePath}`);

    if (newPath !== location.pathname) {
      location = {
        ...location,
        pathname: newPath,
      };
    }
  }

  if (openedWsPaths.primaryWsPath == null) {
    const existing = getPrimaryWsPath(location);
    if (existing) {
      location = {
        ...location,
        pathname: encodeURI(`/ws/${wsName}`),
      };
    }
  }

  if (openedWsPaths.secondaryWsPath) {
    const newSearch = new URLSearchParams(location.search);
    newSearch.set('secondary', openedWsPaths.secondaryWsPath);

    if (newSearch.toString() !== location.search) {
      location = {
        ...location,
        search: newSearch.toString(),
      };
    }
  }

  if (openedWsPaths.secondaryWsPath == null) {
    const newSearch = new URLSearchParams(location.search);
    newSearch.delete('secondary');

    if (newSearch.toString() !== location.search) {
      location = {
        ...location,
        search: newSearch.toString(),
      };
    }
  }

  return location;
}
