import { EditorState } from '@bangle.dev/pm';
import { useEditorViewContext } from '@bangle.dev/react';

import { EditorPluginMetadataKey } from '@bangle.io/constants';

import { findWrappingScrollable } from './utility';

export function getScrollParentElement(editorId: number) {
  const editor = document.querySelector('.editor-container_editor-' + editorId);

  if (editor) {
    return findWrappingScrollable(editor);
  }

  return undefined;
}

export function getEditorPluginMetadata(state: EditorState) {
  const result = EditorPluginMetadataKey.getState(state);
  if (!result) {
    throw new Error('EditorPluginMetadata cannot be undefined');
  }
  return result;
}

export function useEditorPluginMetadata() {
  const view = useEditorViewContext();
  return getEditorPluginMetadata(view.state);
}
