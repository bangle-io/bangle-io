import type { BangleEditor } from '@bangle.dev/core';

import {
  getEditorPluginMetadata,
  getScrollParentElement,
} from '@bangle.io/utils';

export const calculateSelection = (editorId: number, editor: BangleEditor) => {
  const selection = editor.view.state.selection;

  return {
    wsPath: getEditorPluginMetadata(editor.view.state).wsPath,
    editorId: editorId,
    selectionJson: selection.toJSON(),
  };
};

export const calculateScrollPosition = (
  editorId: number,
  editor: BangleEditor,
) => {
  const top = getScrollParentElement(editorId)?.scrollTop;

  if (typeof top === 'number') {
    return {
      wsPath: getEditorPluginMetadata(editor.view.state).wsPath,
      editorId: editorId,
      scrollPosition: top,
    };
  }

  return undefined;
};
