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
  private selections: ({ [wsPath: string]: JsonObject | null } | null)[];
  private scrollPositions: ({ [wsPath: string]: number | null } | null)[];

  constructor({
    selections,
    scrollPositions,
  }: {
    selections: OpenedEditorsConfig['selections'];
    scrollPositions: OpenedEditorsConfig['scrollPositions'];
  }) {
    this.selections = createEmptyArray(MAX_OPEN_EDITORS).map((r, i) => {
      let res = selections[i];

      return res == null ? null : res;
    });

    this.scrollPositions = createEmptyArray(MAX_OPEN_EDITORS).map((r, i) => {
      let res = scrollPositions[i];

      return res == null ? null : res;
    });
  }

  getSelection(wsPath: string, editorId: EditorIdType): JsonObject | undefined {
    if (typeof editorId !== 'number') {
      return undefined;
    }

    const result = this.selections[editorId]?.[wsPath];

    return result == null ? undefined : result;
  }

  getScrollPosition(wsPath: string, editorId: EditorIdType) {
    if (typeof editorId !== 'number') {
      return undefined;
    }

    const result = this.scrollPositions[editorId]?.[wsPath];

    return result == null ? undefined : result;
  }

  updateSelection(
    selection: JsonObject | undefined,
    wsPath: string,
    editorId: EditorIdType,
  ): OpenedEditorsConfig {
    if (typeof editorId !== 'number') {
      return this;
    }
    const newSelections = [...this.selections];

    let result = newSelections[editorId];

    if (!result) {
      result = {};
    }

    newSelections[editorId] = result;

    result[wsPath] = selection == null ? null : selection;

    return new OpenedEditorsConfig({
      selections: newSelections,
      scrollPositions: this.scrollPositions,
    });
  }

  updateScrollPosition(
    scrollPosition: number | undefined,
    wsPath: string,
    editorId: EditorIdType,
  ): OpenedEditorsConfig {
    if (typeof editorId !== 'number') {
      return this;
    }

    const newScrollPositions = [...this.scrollPositions];

    let result = newScrollPositions[editorId];
    if (!result) {
      result = {};
    }

    newScrollPositions[editorId] = result;

    result[wsPath] = scrollPosition == null ? null : scrollPosition;

    return new OpenedEditorsConfig({
      selections: this.selections,
      scrollPositions: newScrollPositions,
    });
  }

  toJsonObj() {
    const selections = this.selections;
    const scrollPositions = this.scrollPositions;

    return { selections, scrollPositions };
  }
}
