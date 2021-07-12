import { RegisterActionHandlerType } from 'extension-registry';
import { useEffect } from 'react';
import { useUIManagerContext } from 'ui-context/index';

export function NoteBrowserActionHandler({
  registerActionHandler,
}: {
  registerActionHandler: RegisterActionHandlerType;
}) {
  const { sidebar, dispatch } = useUIManagerContext();

  useEffect(() => {
    const deregister = registerActionHandler((actionObject) => {
      switch (actionObject.name) {
        case '@action/note-browser/show-note-browser': {
          dispatch({
            type: 'UI/CHANGE_SIDEBAR',
            value: {
              type: '@sidebar/note-browser/note-browser',
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
