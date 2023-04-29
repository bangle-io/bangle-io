import type { EditorView } from '@bangle.dev/pm';
import { Plugin } from '@bangle.dev/pm';

import type { EditorPlugin } from '@bangle.io/shared-types';
import { onFocusUpdate } from '@bangle.io/slice-editor-manager';
import { getEditorPluginMetadata } from '@bangle.io/utils';

export const watchEditorFocus: EditorPlugin = function watchEditorFocus() {
  return new Plugin({
    props: {
      handleDOMEvents: {
        focus: (view: EditorView, event: Event) => {
          const { editorId, nsmStore } = getEditorPluginMetadata(view.state);

          if (editorId != null) {
            nsmStore.dispatch(onFocusUpdate({ editorId }));
          }

          // This is important to return false so that
          // we dont interfere with PM's focus setting.
          return false;
        },
      },
    },
  });
};
