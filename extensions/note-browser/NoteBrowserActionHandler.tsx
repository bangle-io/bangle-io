import { useEffect } from 'react';

import { RegisterActionHandlerType } from '@bangle.io/extension-registry';
import { useUIManagerContext } from '@bangle.io/ui-context';

export function NoteBrowserActionHandler({
  registerActionHandler,
}: {
  registerActionHandler: RegisterActionHandlerType;
}) {
  const { sidebar, dispatch } = useUIManagerContext();

  useEffect(() => {
    const deregister = registerActionHandler((actionObject) => {
      switch (actionObject.name) {
        case 'action::bangle-io-note-browser:toggle-note-browser': {
          dispatch({
            type: 'UI/CHANGE_SIDEBAR',
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
  }, [dispatch, sidebar, registerActionHandler]);
  return null;
}
