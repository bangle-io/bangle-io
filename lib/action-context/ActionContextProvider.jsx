import React, { useCallback, useMemo, useContext } from 'react';
import { ExtensionRegistryContext } from 'extension-registry/index';
import { ActionContext } from './ActionContext';

export function ActionContextProvider({ children }) {
  const extensionRegistry = useContext(ExtensionRegistryContext);

  const actionNameSet = useMemo(() => {
    return new Set(extensionRegistry.getRegisteredActions().map((r) => r.name));
  }, [extensionRegistry]);

  const dispatchAction = useCallback(
    (action) => {
      const { name, value, ...others } = action;

      if (!name) {
        throw new Error('Action must have a name');
      }
      if (!actionNameSet.has(name)) {
        throw new Error('Unknown action ' + name);
      }
      if (Object.keys(others).length > 0) {
        throw new Error(
          'Unknown keys in action : ' + Object.keys(others).join(','),
        );
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
