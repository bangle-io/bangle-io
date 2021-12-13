import React, { createContext, useCallback, useMemo } from 'react';

import { useBangleStoreContext } from '@bangle.io/app-state-context';
import { useExtensionRegistryContext } from '@bangle.io/extension-registry';
import type { DispatchActionType } from '@bangle.io/shared-types';
import { useKeybindings } from '@bangle.io/utils';

const LOG = false;
let log = LOG ? console.log.bind(console, 'ActionCotext') : () => {};

export const ActionContext = createContext<ActionContextType>({
  dispatchAction: () => {},
});

export interface ActionContextType {
  dispatchAction: DispatchActionType;
}

export function ActionContextProvider({ children }) {
  const extensionRegistry = useExtensionRegistryContext();
  const store = useBangleStoreContext();

  const actionNameSet = useMemo(() => {
    return new Set(extensionRegistry.getRegisteredActions().map((r) => r.name));
  }, [extensionRegistry]);

  const dispatchAction = useCallback<ActionContextType['dispatchAction']>(
    (action) => {
      const { name, value, ...others } = action;
      log({ name, value });

      (window as any).Sentry?.addBreadcrumb?.({
        type: 'action',
        message: name,
        timestamp: Date.now(),
      });

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

      // TODO for now also send to the store until we consolidate the two.
      store.dispatch(action);
    },
    [extensionRegistry, actionNameSet, store],
  );

  const value = useMemo(() => {
    const val: ActionContextType = {
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
