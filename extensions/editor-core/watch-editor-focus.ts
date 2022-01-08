import { Plugin } from '@bangle.dev/pm';

import { updateFocusedEditor } from '@bangle.io/editor-manager-context';
import type { EditorPlugin } from '@bangle.io/shared-types';
import { getEditorPluginMetadata } from '@bangle.io/utils';

export const watchEditorFocus: EditorPlugin = function watchEditorFocus() {
  return new Plugin({
    props: {
      handleDOMEvents: {
        focus: (view, event) => {
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
