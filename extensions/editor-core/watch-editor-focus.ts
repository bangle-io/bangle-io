import { Plugin } from '@bangle.dev/pm';

import { EditorManagerAction } from '@bangle.io/editor-manager-context';
import type { EditorPlugin } from '@bangle.io/shared-types';
import { getEditorPluginMetadata } from '@bangle.io/utils';

export const watchEditorFocus: EditorPlugin = function watchEditorFocus() {
  return new Plugin({
    props: {
      handleDOMEvents: {
        focus: (view, event) => {
          const { dispatchSerialOperation, editorId } = getEditorPluginMetadata(
            view.state,
          );
          const operation: EditorManagerAction = {
            name: 'action::editor-manager-context:on-focus-update',
            value: { editorId },
          };
          dispatchSerialOperation(operation);

          // This is important to return false so that
          // we dont interfere with PM's focus setting.
          return false;
        },
      },
    },
  });
};
