import { RegisterActionHandlerType } from 'extension-registry';
import { useCallback, useContext, useEffect } from 'react';
import { UIManagerContext } from 'ui-context/index';
import { SHOW_SEARCH_SIDEBAR_ACTION } from './types';

export function SearchNotesActionHandler({
  registerActionHandler,
}: {
  registerActionHandler: RegisterActionHandlerType;
}) {
  const { sidebar, dispatch } = useContext(UIManagerContext);

  useEffect(() => {
    const deregister = registerActionHandler((actionObject) => {
      switch (actionObject.name) {
        case SHOW_SEARCH_SIDEBAR_ACTION: {
          if (sidebar === '@sidebar/search-notes/search-notes') {
            const inputEl = document.querySelector<HTMLInputElement>(
              'input[aria-label="Search"]',
            );
            inputEl?.focus();
            inputEl?.select();
          }
          dispatch({
            type: 'UI/CHANGE_SIDEBAR',
            value: {
              type: '@sidebar/search-notes/search-notes',
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
