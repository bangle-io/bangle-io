import { useEffect } from 'react';

import { RegisterSerialOperationHandlerType } from '@bangle.io/extension-registry';
import { useUIManagerContext } from '@bangle.io/ui-context';

export function NoteBrowserOpHandler({
  registerSerialOperationHandler,
}: {
  registerSerialOperationHandler: RegisterSerialOperationHandlerType;
}) {
  const { sidebar, dispatch } = useUIManagerContext();

  useEffect(() => {
    const deregister = registerSerialOperationHandler((operation) => {
      switch (operation.name) {
        case 'operation::bangle-io-note-browser:toggle-note-browser': {
          dispatch({
            name: 'action::ui-context:CHANGE_SIDEBAR',
            value: {
              type:
                sidebar === 'sidebar::bangle-io-note-browser:note-browser'
                  ? null
                  : 'sidebar::bangle-io-note-browser:note-browser',
            },
          });
          return true;
        }
        default: {
          return false;
        }
      }
    });
    return () => {
      deregister();
    };
  }, [dispatch, sidebar, registerSerialOperationHandler]);
  return null;
}
