import type { EditorState } from '@bangle.dev/pm';

import { intersectionObserverPluginKey } from '@bangle.io/editor-common';

export function getEditorIntersectionObserverPluginState(state: EditorState) {
  return intersectionObserverPluginKey.getState(state);
}
