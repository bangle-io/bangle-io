import {
  MAX_OPEN_EDITORS,
  MINI_EDITOR_INDEX,
  PRIMARY_EDITOR_INDEX,
  SECONDARY_EDITOR_INDEX,
} from '@bangle.io/constants';
import { createEmptyArray } from '@bangle.io/utils';

import { MaybeWsPath, resolvePath } from './helpers';

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
  static createEmpty() {
    const wsPaths = createEmptyArray(MAX_OPEN_EDITORS);

    return new OpenedWsPaths(wsPaths);
  }

  static createFromArray(array: Array<string | null | undefined>) {
    let safeArray = Array.from({ length: MAX_OPEN_EDITORS }, (_, k) => {
      return array[k] || undefined;
    });

    return new OpenedWsPaths(safeArray);
  }

  constructor(private wsPaths: MaybeWsPath[]) {
    if (wsPaths.length !== MAX_OPEN_EDITORS) {
      throw new Error(
        `Only support ${MAX_OPEN_EDITORS} editors opened at a time`,
      );
    }
  }

  get miniEditorWsPath() {
    return this.wsPaths[MINI_EDITOR_INDEX] ?? undefined;
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

  get primaryWsPath() {
    return this.wsPaths[PRIMARY_EDITOR_INDEX] ?? undefined;
  }

  get secondaryWsPath() {
    return this.wsPaths[SECONDARY_EDITOR_INDEX] ?? undefined;
  }

  // if no wsName is provided, will match against the internal wsName
  allBelongToSameWsName(wsName?: string): boolean {
    if (!this.hasSomeOpenedWsPaths()) {
      return true;
    }
    const wsNames = this.getWsNames();

    if (wsName == null) {
      return wsNames.length === 1;
    }

    return wsNames.length === 1 && wsName === wsNames[0];
  }

  // check  opened editors (if any) belong to the same workspace
  closeAll() {
    let newObj = OpenedWsPaths.createEmpty();

    // avoid changing instance
    if (newObj.equal(this)) {
      return this;
    } else {
      return newObj;
    }
  }

  // in case there no opened editors, returns true.
  closeIfFound(wsPath: MaybeWsPath): OpenedWsPaths {
    return this.updateIfFound(wsPath, undefined);
  }

  // does not shrink the size but filters out
  equal(compareWith: OpenedWsPaths) {
    if (compare(this.wsPaths, compareWith.wsPaths)) {
      return true;
    }

    return false;
  }

  forEachWsPath(cb: (wsPath: MaybeWsPath, index: number) => void) {
    this.wsPaths.forEach((p, i) => {
      if (p) {
        cb(p, i);
      }
    });
  }

  getByIndex(index: number) {
    if (index >= this.wsPaths.length) {
      throw new Error('getByIndex: Out of bound operation');
    }

    return this.wsPaths[index];
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

  // Run a bunch of algorithms to optimize the space of editors.
  optimizeSpace() {
    return this.tryUpgradeSecondary();
  }

  toArray() {
    // mapping undefined to null since undefined is not serializable
    return Array.from(this.wsPaths).map((r) => (r ? r : null));
  }

  // If primaryWsPath is empty, try moving secondary to primary.
  // If primaryWsPath is not empty, do no nothing
  tryUpgradeSecondary() {
    const { secondaryWsPath, primaryWsPath } = this;

    if (secondaryWsPath != null && primaryWsPath == null) {
      return this.updatePrimaryWsPath(secondaryWsPath).updateSecondaryWsPath(
        undefined,
      );
    }

    return this;
  }

  update(openedWsPath: OpenedWsPaths): OpenedWsPaths {
    const result = openedWsPath;

    // avoid changing instance
    if (result.equal(this)) {
      return this;
    }

    return result;
  }

  updateAllWsPaths(wsPaths: MaybeWsPath[]) {
    const result = OpenedWsPaths.createFromArray(wsPaths);

    // avoid changing instance
    if (result.equal(this)) {
      return this;
    }

    return result;
  }

  updateByIndex(index: number, wsPath: MaybeWsPath) {
    if (index >= this.wsPaths.length) {
      throw new Error('updateByIndex: Out of bound operation');
    }

    const items = this.wsPaths.slice(0);
    items[index] = wsPath;

    return this.updateAllWsPaths(items);
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

  updateMiniEditorWsPath(wsPath: MaybeWsPath) {
    return this.updateByIndex(MINI_EDITOR_INDEX, wsPath);
  }

  updatePrimaryWsPath(wsPath: MaybeWsPath) {
    return this.updateByIndex(PRIMARY_EDITOR_INDEX, wsPath);
  }

  updateSecondaryWsPath(wsPath: MaybeWsPath) {
    return this.updateByIndex(SECONDARY_EDITOR_INDEX, wsPath);
  }
}
