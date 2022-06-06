import React, { useCallback, useContext, useMemo, useState } from 'react';

import { useExtensionRegistryContext } from './ExtensionRegistryContext';

class AllExtensionStore {
  private _store: { [key: string]: any };

  constructor(initialValues: { [key: string]: any }) {
    this._store = Object.assign({}, initialValues);
  }

  getExtensionState<T>(key: string): T {
    return this._store[key];
  }

  updateExtensionState<T>(key: string, value: T) {
    let newValue =
      typeof value === 'function' ? value(this.getExtensionState(key)) : value;

    return new AllExtensionStore(
      Object.assign({}, this._store, { [key]: newValue }),
    );
  }
}

/**
 * This context stores the state of each extension in a global context
 * object with the schema { [ExtensionName: string]:  ExtensionsState }
 * and also provides a callback to update the extensions state.
 *
 * TODO: with passing the extension name as a string it is very easy
 * for other extensions to access other extensions
 * state -- a pattern we do not want to allow.
 */

const ExtensionStateContext = React.createContext<
  [
    AllExtensionStore,
    (
      state:
        | AllExtensionStore
        | ((oldState: AllExtensionStore) => AllExtensionStore),
    ) => void,
  ]
>([new AllExtensionStore({}), (state) => {}]);

type Updater<ExtensionState> = (
  update: ExtensionState | ((oldState: ExtensionState) => ExtensionState),
) => void;

export function useExtensionState<ExtensionState>(
  extensionName: string,
): [ExtensionState, Updater<ExtensionState>] {
  const [globalState, updateGlobalState] = useContext(ExtensionStateContext);

  const updater: Updater<ExtensionState> = useCallback(
    (extensionState) => {
      updateGlobalState((allExtensionState) => {
        return allExtensionState.updateExtensionState(
          extensionName,
          extensionState,
        );
      });
    },
    [extensionName, updateGlobalState],
  );

  const state = useMemo(() => {
    return globalState.getExtensionState<ExtensionState>(extensionName);
  }, [extensionName, globalState]);

  return [state, updater];
}

export function ExtensionStateContextProvider({
  children,
}: {
  children: JSX.Element;
}) {
  const extensionRegistry = useExtensionRegistryContext();

  const [allExtensionState, updateAllExtensionState] = useState(() => {
    return new AllExtensionStore(extensionRegistry.extensionsInitialState);
  });

  const value: [AllExtensionStore, typeof updateAllExtensionState] =
    useMemo(() => {
      return [allExtensionState, updateAllExtensionState];
    }, [allExtensionState, updateAllExtensionState]);

  return (
    <ExtensionStateContext.Provider value={value}>
      {children}
    </ExtensionStateContext.Provider>
  );
}
