import React, { createContext, useCallback, useMemo } from 'react';

import { useExtensionRegistryContext } from '@bangle.io/extension-registry';
import type { DispatchSerialOperationType } from '@bangle.io/shared-types';
import { useKeybindings } from '@bangle.io/utils';

const LOG = false;
let log = LOG ? console.log.bind(console, 'SerialOperationCotext') : () => {};

export const SerialOperationContext = createContext<SerialOperationContextType>(
  {
    dispatchSerialOperation: () => {},
  },
);

export interface SerialOperationContextType {
  dispatchSerialOperation: DispatchSerialOperationType;
}

export function SerialOperationContextProvider({ children }) {
  const extensionRegistry = useExtensionRegistryContext();

  const operationNameSet = useMemo(() => {
    return new Set(
      extensionRegistry.getRegisteredOperations().map((r) => r.name),
    );
  }, [extensionRegistry]);

  const dispatchSerialOperation = useCallback<
    SerialOperationContextType['dispatchSerialOperation']
  >(
    (operation) => {
      const { name, value, ...others } = operation;
      log({ name, value });

      (window as any).Sentry?.addBreadcrumb?.({
        type: 'operation',
        message: name,
        timestamp: Date.now(),
      });

      if (!name) {
        throw new Error('Operation must have a name');
      }

      if (!operationNameSet.has(name)) {
        console.log(operationNameSet, name);
        throw new Error('Unknown operation ' + name);
      }
      if (Object.keys(others).length > 0) {
        throw new Error(
          'Unknown keys in operation : ' + Object.keys(others).join(','),
        );
      }
      // Converting to array so that we have a fixed operation handlers for the current operation
      // because there are cases which add or remove handler (react hooks) resulting in double execution
      for (const handler of Array.from(
        extensionRegistry.getSerialOperationHandlers(),
      )) {
        handler(operation);
      }
    },
    [extensionRegistry, operationNameSet],
  );

  const value = useMemo(() => {
    const val: SerialOperationContextType = {
      dispatchSerialOperation,
    };
    return val;
  }, [dispatchSerialOperation]);

  useKeybindings(() => {
    const operations = extensionRegistry.getRegisteredOperations();
    console.log({ operations });
    const keys = Object.fromEntries(
      operations
        .filter((r) => r.keybinding)
        .map((r) => [
          r.keybinding,
          () => {
            console.log(r.name);
            dispatchSerialOperation({
              name: r.name,
            });
            return true;
          },
        ]),
    );
    return keys;
  }, [extensionRegistry, dispatchSerialOperation]);

  return (
    <SerialOperationContext.Provider value={value}>
      {children}
    </SerialOperationContext.Provider>
  );
}
