import { useCallback, useEffect } from 'react';

import { heading, listItem } from '@bangle.dev/base-components';

import { useEditorManagerContext } from '@bangle.io/editor-manager-context';

import { useDispatchPrimaryEditor } from './hooks';

const { toggleHeadingCollapse, uncollapseAllHeadings } = heading;
const { moveListItemUp, moveListItemDown } = listItem;

export function EditorCore({ registerActionHandler }) {
  const { primaryEditor, updateFocusedEditor } = useEditorManagerContext();
  const executeEditorCommand = useDispatchPrimaryEditor(false);

  const actionHandler = useCallback(
    (actionObject) => {
      switch (actionObject.name) {
        case 'action::bangle-io-editor-core:focus-primary-editor': {
          primaryEditor?.focusView();
          return true;
        }

        case 'action::bangle-io-editor-core:collapse-heading': {
          executeEditorCommand(toggleHeadingCollapse);
          return true;
        }

        case 'action::bangle-io-editor-core:uncollapse-all-heading': {
          executeEditorCommand(uncollapseAllHeadings);
          return true;
        }

        case 'action::bangle-io-editor-core:move-list-up': {
          executeEditorCommand(moveListItemUp);
          return true;
        }

        case 'action::bangle-io-editor-core:move-list-down': {
          executeEditorCommand(moveListItemDown);
          return true;
        }

        case 'action::bangle-io-editor-core:on-focus-update': {
          updateFocusedEditor(actionObject.value.editorId);
          return true;
        }

        default: {
          return false;
        }
      }
    },
    [primaryEditor, updateFocusedEditor, executeEditorCommand],
  );

  useEffect(() => {
    const deregister = registerActionHandler((obj) => {
      actionHandler(obj);
    });
    return () => {
      deregister();
    };
  }, [actionHandler, registerActionHandler]);

  return null;
}
