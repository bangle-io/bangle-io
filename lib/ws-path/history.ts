// import type { History as _History } from 'history';
// eslint-disable-next-line import/no-unresolved
import type { History as _History } from 'history';
import { matchPath } from 'react-router-dom';

import { filePathToWsPath, resolvePath } from './helpers';

type MaybeWsPath = string | undefined;

export type Location = _History<any>['location'];
export type History = _History<any>;

const MAX_SIZE = 2;
/**
 * This exists to keep null and undefined value interchangeable
 */
function compare<T>(a: T[], b: T[]): boolean {
  return (
    a.length === b.length &&
    a.every((value, index) => {
      if (value == null && b[index] == null) {
        return true;
      }
      return value === b[index];
    })
  );
}

export class OpenedWsPaths {
  constructor(private wsPaths: MaybeWsPath[]) {
    if (wsPaths.length !== MAX_SIZE) {
      throw new Error(`Only support ${MAX_SIZE} editors opened at a time`);
    }
  }
  get primaryWsPath() {
    return this.wsPaths[0] ?? undefined;
  }

  get secondaryWsPath() {
    return this.wsPaths[1] ?? undefined;
  }

  forEachWsPath(cb: (wsPath: MaybeWsPath, index: number) => void) {
    this.wsPaths.forEach((p, i) => {
      if (p) {
        cb(p, i);
      }
    });
  }

  updatePrimaryWsPath(wsPath: MaybeWsPath) {
    return this.updateByIndex(0, wsPath);
  }

  updateSecondaryWsPath(wsPath: MaybeWsPath) {
    return this.updateByIndex(1, wsPath);
  }

  getByIndex(index: number) {
    if (index >= this.wsPaths.length) {
      throw new Error('getByIndex: Out of bound operation');
    }

    return this.wsPaths[index];
  }

  updateByIndex(index: number, wsPath: MaybeWsPath) {
    if (index >= this.wsPaths.length) {
      throw new Error('updateByIndex: Out of bound operation');
    }

    const items = this.wsPaths.slice(0);
    items[index] = wsPath;
    return this.updateAllWsPaths(items);
  }

  // does not shrink the size but filters out
  // starting undefined wsPaths
  shrink() {
    const items = this.wsPaths.filter((r) => r);

    const arr: any = Array.from({ length: MAX_SIZE }, (_, k) => {
      return items[k] || undefined;
    });

    return this.updateAllWsPaths(arr);
  }

  updateAllWsPaths(wsPaths: MaybeWsPath[]) {
    const result = new OpenedWsPaths(wsPaths);
    // avoid changing instance
    if (result.equal(this)) {
      return this;
    }
    return result;
  }

  equal(compareWith: OpenedWsPaths) {
    if (compare(this.wsPaths, compareWith.wsPaths)) {
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
  hasSomeOpenedWsPaths() {
    return this.wsPaths.some((r) => {
      return r != null;
    });
  }

  closeIfFound(wsPath: MaybeWsPath): OpenedWsPaths {
    return this.updateIfFound(wsPath, undefined);
  }

  closeAll() {
    let newObj = new OpenedWsPaths(
      Array.from({ length: MAX_SIZE }, () => undefined),
    );
    // avoid changing instance
    if (newObj.equal(this)) {
      return this;
    } else {
      return newObj;
    }
  }

  updateIfFound(
    wsPath: MaybeWsPath,
    replaceWsPath: MaybeWsPath,
  ): OpenedWsPaths {
    let ret: OpenedWsPaths = this;

    this.forEachWsPath((_wsPath, i) => {
      if (wsPath === _wsPath) {
        ret = ret.updateByIndex(i, replaceWsPath);
      }
    });
    return ret;
  }

  toArray() {
    return Array.from(this.wsPaths);
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
