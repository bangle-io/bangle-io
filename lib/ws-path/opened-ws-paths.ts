import { MAX_OPEN_EDITORS } from '@bangle.io/constants';
import { createEmptyArray } from '@bangle.io/utils';

import { MaybeWsPath, resolvePath } from './helpers';

export interface Location {
  pathname?: string;
  search?: string;
}

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
  static createFromArray(array: (string | null | undefined)[]) {
    let safeArray = Array.from({ length: MAX_OPEN_EDITORS }, (_, k) => {
      return array[k] || undefined;
    });

    return new OpenedWsPaths(safeArray);
  }

  static createEmpty() {
    const wsPaths = createEmptyArray(MAX_OPEN_EDITORS);

    return new OpenedWsPaths(wsPaths);
  }

  constructor(private wsPaths: MaybeWsPath[]) {
    if (wsPaths.length !== MAX_OPEN_EDITORS) {
      throw new Error(
        `Only support ${MAX_OPEN_EDITORS} editors opened at a time`,
      );
    }
  }

  get primaryWsPath() {
    return this.wsPaths[0] ?? undefined;
  }

  get secondaryWsPath() {
    return this.wsPaths[1] ?? undefined;
  }

  get openCount() {
    let count = 0;
    this.forEachWsPath((wsPath) => {
      if (wsPath) {
        count++;
      }
    });

    return count;
  }

  // check  opened editors (if any) belong to the same workspace
  // in case there no opened editors, returns true.
  // if no wsName is provided, will match against the internal wsName
  allBelongToSameWsName(wsName?: string) {
    if (!this.hasSomeOpenedWsPaths()) {
      return true;
    }
    const wsNames = this.getWsNames();

    if (wsName == null) {
      return wsNames.length === 1;
    }

    return wsNames.length === 1 && wsName === wsNames[0];
  }

  // Returns the unique wsName (workspace name) of all the paths.
  getWsNames(): string[] {
    let wsNames: Set<string> = new Set();
    this.forEachWsPath((wsPath) => {
      if (wsPath) {
        wsNames.add(resolvePath(wsPath).wsName);
      }
    });

    return [...wsNames];
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

    const arr: any = Array.from({ length: MAX_OPEN_EDITORS }, (_, k) => {
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
    let newObj = OpenedWsPaths.createEmpty();

    // avoid changing instance
    if (newObj.equal(this)) {
      return this;
    } else {
      return newObj;
    }
  }

  update(openedWsPath: OpenedWsPaths): OpenedWsPaths {
    const result = openedWsPath;
    // avoid changing instance
    if (result.equal(this)) {
      return this;
    }

    return result;
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
    // mapping undefined to null since undefined is not serializable
    return Array.from(this.wsPaths).map((r) => (r ? r : null));
  }
}
