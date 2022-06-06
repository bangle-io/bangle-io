import type { EditorView } from '@bangle.dev/pm';
import { Plugin } from '@bangle.dev/pm';

import type { EditorPlugin } from '@bangle.io/shared-types';
import { updateFocusedEditor } from '@bangle.io/slice-editor-manager';
import { getEditorPluginMetadata } from '@bangle.io/utils';

export const watchEditorFocus: EditorPlugin = function watchEditorFocus() {
  return new Plugin({
    props: {
      handleDOMEvents: {
        focus: (view: EditorView, event: Event) => {
          const { bangleStore, editorId } = getEditorPluginMetadata(view.state);

          updateFocusedEditor(editorId)(
            bangleStore.state,
            bangleStore.dispatch,
          );

          // This is important to return false so that
          // we dont interfere with PM's focus setting.
          return false;
        },
      },
    },
  });
};
