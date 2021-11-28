import type { EditorState, PluginKey } from '@bangle.dev/pm';

import {
  EditorPluginMetadataKey,
  intersectionObserverPluginKey,
} from '@bangle.io/constants';

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

export function getEditorIntersectionObserverPluginState(state: EditorState) {
  const result = intersectionObserverPluginKey.getState(state);
  return result;
}

export function hasPluginStateChanged<T>(
  pluginKey: PluginKey<T>,
  newState: EditorState,
  oldState: EditorState,
) {
  return pluginKey.getState(newState) !== pluginKey.getState(oldState);
}
