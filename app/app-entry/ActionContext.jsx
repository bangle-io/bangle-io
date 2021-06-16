import { EditorManagerContext } from 'editor-manager-context';
import React, { useCallback, useMemo, useContext } from 'react';
import { ActionContext } from 'action-context/index';

export function ActionContextProvider({ children }) {
  const { bangleIOContext } = useContext(EditorManagerContext);

  const actionNameSet = useMemo(() => {
    return new Set(bangleIOContext.getRegisteredActions().map((r) => r.name));
  }, [bangleIOContext]);

  const dispatchAction = useCallback(
    (action) => {
      if (!action.name) {
        throw new Error('Action must have a name');
      }
      if (!actionNameSet.has(action.name)) {
        throw new Error('Unknown action ' + action.name);
      }
      for (const handler of bangleIOContext.getActionHandlers()) {
        if (handler(action) === true) {
          break;
        }
      }
    },
    [bangleIOContext, actionNameSet],
  );

  const value = useMemo(() => {
    return {
      dispatchAction,
    };
  }, [dispatchAction]);
  return (
    <ActionContext.Provider value={value}>{children}</ActionContext.Provider>
  );
}
