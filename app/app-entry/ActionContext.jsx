import { EditorManagerContext } from 'editor-manager-context';
import React, { useCallback, useMemo, useContext } from 'react';
import { ActionContext } from 'action-context/index';

export function ActionContextProvider({ children }) {
  const { extensionRegistry } = useContext(EditorManagerContext);

  const actionNameSet = useMemo(() => {
    return new Set(extensionRegistry.getRegisteredActions().map((r) => r.name));
  }, [extensionRegistry]);

  const dispatchAction = useCallback(
    (action) => {
      if (!action.name) {
        throw new Error('Action must have a name');
      }
      if (!actionNameSet.has(action.name)) {
        throw new Error('Unknown action ' + action.name);
      }
      for (const handler of extensionRegistry.getActionHandlers()) {
        if (handler(action) === true) {
          break;
        }
      }
    },
    [extensionRegistry, actionNameSet],
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
