import type { BangleEditor } from '@bangle.dev/core';
import type { EditorView } from '@bangle.dev/pm';

import { MAX_OPEN_EDITORS } from '@bangle.io/constants';
import type { EditorIdType } from '@bangle.io/shared-types';
import {
  getEditorPluginMetadata,
  getScrollParentElement,
} from '@bangle.io/utils';

import type { EditorSliceState } from './types';

export const calculateSelection = (
  editorId: EditorIdType,
  editor: BangleEditor,
) => {
  const selection = editor.view.state.selection;

  return {
    wsPath: getEditorPluginMetadata(editor.view.state).wsPath,
    editorId: editorId,
    selectionJson: selection.toJSON(),
  };
};

export const calculateScrollPosition = (
  editorId: EditorIdType,
  view: EditorView,
) => {
  const top = getScrollParentElement(editorId)?.scrollTop;

  if (typeof top === 'number') {
    return {
      wsPath: getEditorPluginMetadata(view.state).wsPath,
      editorId: editorId,
      scrollPosition: top,
    };
  }

  return undefined;
};

export function* getEachEditorIterable(
  editorManagerState: EditorSliceState,
): Iterable<{
  editor: BangleEditor | undefined;
  editorId: NonNullable<EditorIdType>;
}> {
  for (const [index, editor] of editorManagerState.mainEditors.entries()) {
    yield { editor, editorId: index };
  }
}

export function isValidEditorId(editorId: EditorIdType): boolean {
  return editorId >= 0 && editorId < MAX_OPEN_EDITORS;
}

export function assertValidEditorId(
  editorId: EditorIdType,
): asserts editorId is EditorIdType {
  if (!isValidEditorId(editorId)) {
    throw new Error('editorId is out of range or invalid');
  }
}
