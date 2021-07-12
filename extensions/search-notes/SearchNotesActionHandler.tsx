import { RegisterActionHandlerType } from 'extension-registry';
import { useEffect } from 'react';
import { useUIManagerContext } from 'ui-context';
import { SHOW_SEARCH_SIDEBAR_ACTION, SIDEBAR_NAME } from './types';

export function SearchNotesActionHandler({
  registerActionHandler,
}: {
  registerActionHandler: RegisterActionHandlerType;
}) {
  const { sidebar, dispatch } = useUIManagerContext();

  useEffect(() => {
    const deregister = registerActionHandler((actionObject) => {
      switch (actionObject.name) {
        case SHOW_SEARCH_SIDEBAR_ACTION: {
          if (sidebar === SIDEBAR_NAME) {
            const inputEl = document.querySelector<HTMLInputElement>(
              'input[aria-label="Search"]',
            );
            inputEl?.focus();
            inputEl?.select();
          }
          dispatch({
            type: 'UI/CHANGE_SIDEBAR',
            value: {
              type: SIDEBAR_NAME,
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
