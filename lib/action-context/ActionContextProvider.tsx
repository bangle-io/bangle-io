import React, { useCallback, useMemo, createContext } from 'react';
import { ActionType, useExtensionRegistryContext } from 'extension-registry';
import { useKeybindings } from 'utils';
export const ActionContext = createContext<ContextType>({
  dispatchAction: () => {},
});

interface ContextType {
  dispatchAction: (action: ActionType) => void;
}

export function ActionContextProvider({ children }) {
  const extensionRegistry = useExtensionRegistryContext();

  const actionNameSet = useMemo(() => {
    return new Set(extensionRegistry.getRegisteredActions().map((r) => r.name));
  }, [extensionRegistry]);

  const dispatchAction = useCallback<ContextType['dispatchAction']>(
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

      // Converting to array so that we have a fixed action handlers for the current action
      // because there are cases which add or remove handler (react hooks) resulting in double execution
      for (const handler of Array.from(extensionRegistry.getActionHandlers())) {
        handler(action);
      }
    },
    [extensionRegistry, actionNameSet],
  );

  const value = useMemo(() => {
    const val: ContextType = {
      dispatchAction,
    };
    return val;
  }, [dispatchAction]);

  useKeybindings(() => {
    const actions = extensionRegistry.getRegisteredActions();
    const keys = Object.fromEntries(
      actions
        .filter((r) => r.keybinding)
        .map((r) => [
          r.keybinding,
          () => {
            dispatchAction({
              name: r.name,
            });
            return true;
          },
        ]),
    );
    return keys;
  }, [extensionRegistry, dispatchAction]);

  return (
    <ActionContext.Provider value={value}>{children}</ActionContext.Provider>
  );
}
