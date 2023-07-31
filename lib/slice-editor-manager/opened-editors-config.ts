import { MAX_OPEN_EDITORS } from '@bangle.io/constants';
import { createEmptyArray } from '@bangle.io/mini-js-utils';
import { z } from '@bangle.io/nsm-3';

import type { EditorIdType } from './types';
import type { SelectionJson } from './utils';
import { selectionJsonSchema } from './utils';

const scrollPositionSchema = z
  .array(
    z.union([
      z.undefined(),
      z.record(z.union([z.number(), z.null(), z.undefined()])),
    ]),
  )
  .length(MAX_OPEN_EDITORS);

const selectionsSchema = z
  .array(
    z.union([
      z.undefined(),
      z.record(z.union([z.undefined(), selectionJsonSchema])),
    ]),
  )
  .length(MAX_OPEN_EDITORS);

export const openedEditorsConfigSchema = z.object({
  selections: selectionsSchema,
  scrollPositions: scrollPositionSchema,
});

type OpenedEditorsScrollPositions = z.infer<typeof scrollPositionSchema>;
type OpenedEditorsSelections = z.infer<typeof selectionsSchema>;

export class OpenedEditorsConfig {
  static fromJsonObj(val: z.infer<typeof openedEditorsConfigSchema>) {
    const { selections = [], scrollPositions = [] } = val;

    return new OpenedEditorsConfig({
      selections: selections,
      scrollPositions: scrollPositions,
    });
  }

  readonly selections: OpenedEditorsSelections;
  readonly scrollPositions: OpenedEditorsScrollPositions;
  constructor({
    selections,
    scrollPositions,
  }: {
    selections: OpenedEditorsSelections;
    scrollPositions: OpenedEditorsScrollPositions;
  }) {
    this.selections = createEmptyArray(MAX_OPEN_EDITORS).map((r, i) => {
      let res = selections[i];

      return res == null ? undefined : res;
    });

    this.scrollPositions = createEmptyArray(MAX_OPEN_EDITORS).map((r, i) => {
      let res = scrollPositions[i];

      return res == null ? undefined : res;
    });
  }

  getScrollPosition(wsPath: string, editorId: EditorIdType) {
    if (typeof editorId !== 'number') {
      return undefined;
    }

    const result = this.scrollPositions[editorId]?.[wsPath];

    return result == null ? undefined : result;
  }

  getSelection(
    wsPath: string,
    editorId: EditorIdType,
  ): SelectionJson | undefined {
    if (typeof editorId !== 'number') {
      return undefined;
    }

    const result = this.selections[editorId]?.[wsPath];

    return result == null ? undefined : result;
  }

  toJsonObj(): z.infer<typeof openedEditorsConfigSchema> {
    const selections = this.selections;
    const scrollPositions = this.scrollPositions;

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
    const newScrollPositions = [...this.scrollPositions];

    let result = newScrollPositions[editorId];

    if (!result) {
      result = {};
    }

    newScrollPositions[editorId] = result;

    result[wsPath] = scrollPosition == null ? undefined : scrollPosition;

    return new OpenedEditorsConfig({
      selections: this.selections,
      scrollPositions: newScrollPositions,
    });
  }

  updateSelection(
    selection: SelectionJson,
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

    result[wsPath] = selection == null ? undefined : selection;

    return new OpenedEditorsConfig({
      selections: newSelections,
      scrollPositions: this.scrollPositions,
    });
  }
}
