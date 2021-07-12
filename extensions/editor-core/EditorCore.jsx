import { heading, listItem } from '@bangle.dev/core';
import { EditorManagerContext } from 'editor-manager-context/index';
import { useCallback, useContext, useEffect } from 'react';
import { useDispatchPrimaryEditor } from './hooks';

const { toggleHeadingCollapse, uncollapseAllHeadings } = heading;
const { moveListItemUp, moveListItemDown } = listItem;

export function EditorCore({ registerActionHandler }) {
  const { primaryEditor } = useContext(EditorManagerContext);
  const executeEditorCommand = useDispatchPrimaryEditor(false);

  const actionHandler = useCallback(
    (actionObject) => {
      switch (actionObject.name) {
        case '@action/editor-core/focus-primary-editor': {
          primaryEditor?.focusView();
          return true;
        }

        case '@action/editor-core/collapse-heading': {
          executeEditorCommand(toggleHeadingCollapse);
          return true;
        }

        case '@action/editor-core/uncollapse-all-heading': {
          executeEditorCommand(uncollapseAllHeadings);
          return true;
        }

        case '@action/editor-core/move-list-up': {
          executeEditorCommand(moveListItemUp);
          return true;
        }

        case '@action/editor-core/move-list-down': {
          executeEditorCommand(moveListItemDown);
          return true;
        }

        default: {
          return false;
        }
      }
    },
    [primaryEditor, executeEditorCommand],
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
