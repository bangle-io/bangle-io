import { MAX_OPEN_EDITORS } from '@bangle.io/constants';
import type { JsonObject } from '@bangle.io/shared-types';
import { createEmptyArray } from '@bangle.io/utils';

import type { EditorIdType } from './types';

export class OpenedEditorsConfig {
  static fromJsonObj(val: any) {
    const { selections = [], scrollPositions = [] } = val;

    return new OpenedEditorsConfig({
      selections: selections,
      scrollPositions: scrollPositions,
    });
  }

  private _scrollPositions: Array<{ [wsPath: string]: number | null } | null>;
  private _selections: Array<{ [wsPath: string]: JsonObject | null } | null>;

  constructor({
    selections,
    scrollPositions,
  }: {
    selections: OpenedEditorsConfig['_selections'];
    scrollPositions: OpenedEditorsConfig['_scrollPositions'];
  }) {
    this._selections = createEmptyArray(MAX_OPEN_EDITORS).map((r, i) => {
      let res = selections[i];

      return res == null ? null : res;
    });

    this._scrollPositions = createEmptyArray(MAX_OPEN_EDITORS).map((r, i) => {
      let res = scrollPositions[i];

      return res == null ? null : res;
    });
  }

  getScrollPosition(wsPath: string, editorId: EditorIdType) {
    if (typeof editorId !== 'number') {
      return undefined;
    }

    const result = this._scrollPositions[editorId]?.[wsPath];

    return result == null ? undefined : result;
  }

  getSelection(wsPath: string, editorId: EditorIdType): JsonObject | undefined {
    if (typeof editorId !== 'number') {
      return undefined;
    }

    const result = this._selections[editorId]?.[wsPath];

    return result == null ? undefined : result;
  }

  toJsonObj() {
    const selections = this._selections;
    const scrollPositions = this._scrollPositions;

    return { selections, scrollPositions };
  }

  updateScrollPosition(
    scrollPosition: number | undefined,
    wsPath: string,
    editorId: EditorIdType,
  ): OpenedEditorsConfig {
    if (typeof editorId !== 'number') {
      return this;
    }
    const newScrollPositions = [...this._scrollPositions];

    let result = newScrollPositions[editorId];

    if (!result) {
      result = {};
    }

    newScrollPositions[editorId] = result;

    result[wsPath] = scrollPosition == null ? null : scrollPosition;

    return new OpenedEditorsConfig({
      selections: this._selections,
      scrollPositions: newScrollPositions,
    });
  }

  updateSelection(
    selection: JsonObject | undefined,
    wsPath: string,
    editorId: EditorIdType,
  ): OpenedEditorsConfig {
    if (typeof editorId !== 'number') {
      return this;
    }
    const newSelections = [...this._selections];

    let result = newSelections[editorId];

    if (!result) {
      result = {};
    }

    newSelections[editorId] = result;

    result[wsPath] = selection == null ? null : selection;

    return new OpenedEditorsConfig({
      selections: newSelections,
      scrollPositions: this._scrollPositions,
    });
  }
}
