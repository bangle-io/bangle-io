import type { EditorState, PluginKey } from '@bangle.dev/pm';

import {
  EditorPluginMetadataKey,
  intersectionObserverPluginKey,
} from '@bangle.io/constants';
import type { EditorIdType } from '@bangle.io/shared-types';

import { findWrappingScrollable } from './utility';

export function getScrollParentElement(editorId: EditorIdType) {
  const editor = document.querySelector(
    '.B-editor-container_editor-' + editorId,
  );

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
  const newP = pluginKey.getState(newState);
  const oldP = pluginKey.getState(oldState);

  return newP !== oldP;
}
