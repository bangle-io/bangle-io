import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { useBangleStoreContext } from '@bangle.io/bangle-store-context';
import { useExtensionRegistryContext } from '@bangle.io/extension-registry';
import type {
  DispatchSerialOperationType,
  SerialOperationType,
} from '@bangle.io/shared-types';
import { useKeybindings } from '@bangle.io/utils';

const LOG = true;
let log = LOG ? console.debug.bind(console, 'SerialOperationCotext') : () => {};

export const SerialOperationContext = createContext<SerialOperationContextType>(
  {
    dispatchSerialOperation: () => {},
  },
);

export interface SerialOperationContextType<
  F extends SerialOperationType = SerialOperationType,
> {
  dispatchSerialOperation: DispatchSerialOperationType<F>;
}

export function SerialOperationContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const bangleStore = useBangleStoreContext();
  const extensionRegistry = useExtensionRegistryContext();

  const operationNameSet = useMemo(() => {
    return new Set(
      extensionRegistry.getRegisteredOperations().map((r) => r.name),
    );
  }, [extensionRegistry]);

  const [abort] = useState(() => new AbortController());

  const [operationHandlers] = useState(() => {
    return extensionRegistry
      .getOperationHandlers()
      .map((r) => r(bangleStore, abort.signal));
  });

  useEffect(() => {
    return () => {
      abort.abort();
      operationHandlers.forEach((o) => {
        o.destroy?.();
      });
    };
  }, [abort, operationHandlers]);

  const dispatchSerialOperation = useCallback<DispatchSerialOperationType>(
    (operation) => {
      const { name, value, ...others } = operation;
      log(name, value);

      (window as any).Sentry?.addBreadcrumb?.({
        type: 'operation',
        message: name,
        timestamp: Date.now(),
      });

      if (!name) {
        throw new Error('Operation must have a name');
      }

      if (!operationNameSet.has(name)) {
        throw new Error('Unknown operation ' + name);
      }
      if (Object.keys(others).length > 0) {
        throw new Error(
          'Unknown keys in operation : ' + Object.keys(others).join(','),
        );
      }

      for (const handler of operationHandlers) {
        let result = handler.handle(operation, value, bangleStore);

        if (result) {
          return;
        }
      }

      // Converting to array so that we have a fixed operation handlers for the current operation
      // because there are cases which add or remove handler (react hooks) resulting in double execution
      for (const handler of Array.from(
        extensionRegistry.getSerialOperationHandlers(),
      )) {
        handler(operation);
      }
    },
    [extensionRegistry, operationNameSet, operationHandlers, bangleStore],
  );

  const value = useMemo(() => {
    const val = {
      dispatchSerialOperation,
    };

    return val;
  }, [dispatchSerialOperation]);

  useKeybindings(() => {
    const operations = extensionRegistry.getRegisteredOperations();
    const keys = Object.fromEntries(
      operations
        .filter((r) => r.keybinding)
        .map((r) => [
          r.keybinding,
          () => {
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
