import { EditorIndex, MAX_OPEN_EDITORS } from '@bangle.io/constants';
import { createEmptyArray } from '@bangle.io/mini-js-utils';

import type { MaybeWsPath } from './helpers';
import {
  createWsName,
  createWsPath,
  resolvePath,
  validateWsPath,
} from './helpers';

type WsPath = string;
type WsName = string;

/**
 * This exists to keep null and undefined value interchangeable
 */
function compareArraysNullSafe<T>(a: T[], b: T[]): boolean {
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

  static createFromArray(array: (string | null | undefined)[]) {
    let safeArray = createEmptyArray(MAX_OPEN_EDITORS).map((_, k) => {
      return array[k] ?? undefined;
    });

    return new OpenedWsPaths(safeArray);
  }

  constructor(private _wsPaths: MaybeWsPath[]) {
    if (_wsPaths.length !== MAX_OPEN_EDITORS) {
      throw new Error(
        `Only support ${MAX_OPEN_EDITORS} editors opened at a time`,
      );
    }
    for (const wsPath of _wsPaths) {
      if (typeof wsPath === 'string') {
        validateWsPath(wsPath);
      }
    }
  }

  get miniEditorWsPath() {
    return this._wsPaths[EditorIndex.MINI] ?? undefined;
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

  get popupEditorWsPath() {
    return this._wsPaths[EditorIndex.POPUP] ?? undefined;
  }

  get primaryWsPath() {
    return this._wsPaths[EditorIndex.PRIMARY] ?? undefined;
  }

  get secondaryWsPath() {
    return this._wsPaths[EditorIndex.SECONDARY] ?? undefined;
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
    if (compareArraysNullSafe(this._wsPaths, compareWith._wsPaths)) {
      return true;
    }

    return false;
  }

  // find all indices of the wsPath
  find(wsPath: WsPath): number[] | undefined {
    let foundIndex: number[] = [];

    this.forEachWsPath((path, index) => {
      if (path && path === wsPath) {
        foundIndex.push(index);
      }
    });

    if (foundIndex.length === 0) {
      return undefined;
    }

    return foundIndex;
  }

  // Note: There might be multiple editor with the same wsPath
  forEachWsPath(cb: (wsPath: MaybeWsPath, index: number) => void) {
    this._wsPaths.forEach((p, i) => {
      if (p) {
        cb(p, i);
      }
    });
  }

  getByIndex(index: number) {
    if (index >= this._wsPaths.length) {
      throw new Error('getByIndex: Out of bound operation');
    }

    return this._wsPaths[index];
  }

  getOneWsName(): WsName | undefined {
    const result = this.getWsNames()[0];

    if (result == null) {
      return result;
    }

    return createWsName(result);
  }

  // Returns the unique wsName (workspace name) of all the paths.
  getWsNames(): string[] {
    let wsNames = new Set<string>();
    this.forEachWsPath((wsPath) => {
      if (wsPath) {
        wsNames.add(resolvePath(wsPath).wsName);
      }
    });

    return [...wsNames];
  }

  // Returns the deduped array of wsPaths of all the opened editors.
  getWsPaths(): string[] {
    return Array.from(
      new Set(this.toArray().filter((r): r is string => typeof r === 'string')),
    );
  }

  /**
   * check if wsPath is in any of the location wspaths
   * @param wsPath
   */
  has(wsPath: MaybeWsPath) {
    if (wsPath == null) {
      return false;
    }

    return this._wsPaths.includes(wsPath);
  }

  /**
   * check if there are any wsPath in this
   */
  hasSomeOpenedWsPaths() {
    return this._wsPaths.some((r) => {
      return r != null;
    });
  }

  // Run a bunch of algorithms to optimize the space of editors.
  optimizeSpace() {
    return this.tryUpgradeSecondary();
  }

  toArray() {
    // mapping undefined to null since undefined is not serializable
    return Array.from(this._wsPaths).map((r) => (r ? r : null));
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
    if (index >= this._wsPaths.length) {
      throw new Error('updateByIndex: Out of bound operation');
    }

    const items = this._wsPaths.slice(0);
    items[index] = wsPath;

    return this.updateAllWsPaths(items);
  }

  updateIfFound(
    wsPath: MaybeWsPath,
    replaceWsPath: MaybeWsPath,
  ): OpenedWsPaths {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let ret: OpenedWsPaths = this;

    this.forEachWsPath((_wsPath, i) => {
      if (wsPath === _wsPath) {
        ret = ret.updateByIndex(i, replaceWsPath);
      }
    });

    return ret;
  }

  updateMiniEditorWsPath(wsPath: MaybeWsPath) {
    return this.updateByIndex(EditorIndex.MINI, wsPath);
  }

  updatePopupEditorWsPath(wsPath: MaybeWsPath) {
    return this.updateByIndex(EditorIndex.POPUP, wsPath);
  }

  updatePrimaryWsPath(wsPath: MaybeWsPath) {
    return this.updateByIndex(EditorIndex.PRIMARY, wsPath);
  }

  updateSecondaryWsPath(wsPath: MaybeWsPath) {
    return this.updateByIndex(EditorIndex.SECONDARY, wsPath);
  }
}