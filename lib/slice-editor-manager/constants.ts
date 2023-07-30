import { MAX_OPEN_EDITORS } from '@bangle.io/constants';
import { createEmptyArray } from '@bangle.io/mini-js-utils';
import { checkWidescreen } from '@bangle.io/utils';

import { OpenedEditorsConfig } from './opened-editors-config';
import type { EditorSliceState } from './types';

// The time to wait before auto focusing any newly
// mounted editor
export const FOCUS_EDITOR_ON_LOAD_COOLDOWN = 1500;

export const initialEditorSliceState: EditorSliceState = {
  focusedEditorId: undefined,
  mainEditors: createEmptyArray(MAX_OPEN_EDITORS),
  editorConfig: OpenedEditorsConfig.fromJsonObj({
    selections: [],
    scrollPositions: [],
  }),
  primaryEditor: undefined,
  secondaryEditor: undefined,

  // We disable editing in mobile devices by default.
  // TODO: move this to a config stating the widescreen status
  editingAllowed: checkWidescreen(),

  editorOpenOrder: [],
  disableEditingCounter: undefined,
  searchQuery: undefined,
};
