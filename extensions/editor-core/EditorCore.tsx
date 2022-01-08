import { useCallback, useEffect } from 'react';

import { heading, listItem } from '@bangle.dev/base-components';

import { useDispatchPrimaryEditor } from './hooks';

const { toggleHeadingCollapse, uncollapseAllHeadings } = heading;
const { moveListItemUp, moveListItemDown } = listItem;

export function EditorCore({ registerSerialOperationHandler }) {
  const executeEditorCommand = useDispatchPrimaryEditor(false);

  const handler = useCallback(
    (operation) => {
      switch (operation.name) {
        case 'operation::bangle-io-editor-core:collapse-heading': {
          executeEditorCommand(toggleHeadingCollapse);
          return true;
        }

        case 'operation::bangle-io-editor-core:uncollapse-all-heading': {
          executeEditorCommand(uncollapseAllHeadings);
          return true;
        }

        case 'operation::bangle-io-editor-core:move-list-up': {
          executeEditorCommand(moveListItemUp);
          return true;
        }

        case 'operation::bangle-io-editor-core:move-list-down': {
          executeEditorCommand(moveListItemDown);
          return true;
        }

        default: {
          return false;
        }
      }
    },
    [executeEditorCommand],
  );

  useEffect(() => {
    const deregister = registerSerialOperationHandler((obj) => {
      handler(obj);
    });
    return () => {
      deregister();
    };
  }, [handler, registerSerialOperationHandler]);

  return null;
}
