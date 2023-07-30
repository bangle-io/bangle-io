import type { EditorState, PluginKey } from '@bangle.dev/pm';

import { EditorPluginMetadataKey } from './constants';

export function getEditorPluginMetadata(state: EditorState) {
  const result = EditorPluginMetadataKey.getState(state);

  if (!result) {
    throw new Error('EditorPluginMetadata cannot be undefined');
  }

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
