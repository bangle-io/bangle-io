import React, { useCallback, useContext, useMemo, useState } from 'react';
import { useExtensionRegistryContext } from './ExtensionRegistryContext';

/**
 * This context stores the state of each extension in a global context
 * object with the schema { [ExtensionName: string]:  ExtensionsState }
 * and also provides a callback to update the extensions state.
 *
 * TODO: with passing the extension name as a string it is very easy
 * for other extensions to access other extensions
 * state -- a pattern we do not want to allow.
 */

const ExtensionStateContext = React.createContext<{
  state: any;
  updatePartialState: (state: any) => any;
}>({
  state: {},
  updatePartialState: (state) => state,
});

type Updater<ExtensionState> = (
  update: ExtensionState | ((oldState: ExtensionState) => ExtensionState),
) => void;

/**
 * Allows reading and updating of an extensions state
 * @param extensionName - the extension's name
 */
export function useExtensionStateContext<ExtensionState>(
  extensionName,
): [ExtensionState, Updater<ExtensionState>] {
  const { state, updatePartialState } = useContext(ExtensionStateContext);

  return useMemo(() => {
    const extensionState: ExtensionState = state[extensionName];
    return [extensionState, updatePartialState(extensionName)];
  }, [state, updatePartialState, extensionName]);
}

export function ExtensionStateContextProvider({
  children,
}: {
  children: JSX.Element;
}) {
  const extensionRegistry = useExtensionRegistryContext();

  const [state, setState] = useState(extensionRegistry.extensionsInitialState);
  type UpdatePartialState<T> = (extensionName: string) => Updater<T>;

  const updatePartialState: UpdatePartialState<string> = useCallback((name) => {
    return (updater) => {
      setState((oldState) => {
        return {
          ...oldState,
          [name]:
            typeof updater === 'function' ? updater(oldState[name]) : updater,
        };
      });
    };
  }, []);

  const value = useMemo(() => {
    return { state, updatePartialState };
  }, [state, updatePartialState]);

  return (
    <ExtensionStateContext.Provider value={value}>
      {children}
    </ExtensionStateContext.Provider>
  );
}
