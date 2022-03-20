/**
 * @jest-environment jsdom
 */
import { act, render } from '@testing-library/react';
import React, { useState } from 'react';

import { defaultSpecs } from '@bangle.dev/all-base-components';

import { useSliceState } from '@bangle.io/bangle-store-context';
import {
  Extension,
  ExtensionRegistry,
  ExtensionRegistryContextProvider,
  useExtensionRegistryContext,
} from '@bangle.io/extension-registry';

import { useSerialOperationHandler } from '..';
import { useSerialOperationContext } from '../SerialOperationContext';
import { SerialOperationContextProvider } from '../SerialOperationContextProvider';

jest.mock('@bangle.io/bangle-store-context', () => {
  const obj = jest.requireActual('@bangle.io/bangle-store-context');

  return {
    ...obj,
    useSliceState: jest.fn(),
  };
});

function ApplicationComponents() {
  const extensionRegistry = useExtensionRegistryContext();

  return <>{extensionRegistry.renderApplicationComponents()}</>;
}

function TestHandler() {
  const [sidebarCounter, updateSidebar] = useState(0);

  useSerialOperationHandler((operation) => {
    switch (operation.name) {
      case 'operation::bangle-io-core:show-search-sidebar': {
        updateSidebar((c) => c + 1);

        return true;
      }
      default: {
        return false;
      }
    }
  }, []);

  return <span>{`result-${sidebarCounter}`}</span>;
}

const useSliceStateMock = useSliceState as jest.MockedFunction<
  typeof useSliceState
>;

beforeEach(() => {
  useSliceStateMock.mockImplementation(() => ({} as any));
});

describe('operation handlers', () => {
  test('works', async () => {
    const initExtensionRegistry = () =>
      new ExtensionRegistry([
        Extension.create({
          name: 'bangle-io-core',
          application: {
            ReactComponent: TestHandler,
            operations: [
              {
                name: 'operation::bangle-io-core:show-search-sidebar',
                title: 'show title bar',
              },
              {
                name: 'operation::bangle-io-core:show-search-sidebar2',
                title: 'show title bar',
              },
            ],
          },
          editor: {
            specs: [...defaultSpecs()],
          },
        }),
      ]);

    let result: ReturnType<typeof render> | undefined,
      dispatchSOp: ReturnType<
        typeof useSerialOperationContext
      >['dispatchSerialOperation'];

    useSliceStateMock.mockImplementation(() => ({
      sliceState: { extensionRegistry: initExtensionRegistry() },
      store: {} as any,
      dispatch: () => {},
    }));

    function DispatchSOp() {
      let obj = useSerialOperationContext();
      dispatchSOp = obj.dispatchSerialOperation;

      return null;
    }
    act(() => {
      result = render(
        <ExtensionRegistryContextProvider>
          <SerialOperationContextProvider>
            <DispatchSOp />
            <ApplicationComponents />
          </SerialOperationContextProvider>
        </ExtensionRegistryContextProvider>,
      );
    });

    expect(result?.container.innerHTML.includes('result-0')).toBe(true);

    act(() => {
      dispatchSOp({ name: 'operation::bangle-io-core:show-search-sidebar' });
    });

    expect(result?.container.innerHTML.includes('result-1')).toBe(true);

    act(() => {
      dispatchSOp({ name: 'operation::bangle-io-core:show-search-sidebar2' });
    });

    expect(result?.container.innerHTML.includes('result-1')).toBe(true);
  });

  test('operation handler works', async () => {
    let operationMatch = jest.fn();
    let operationsReceived: any[] = [];
    const initExtensionRegistry = () =>
      new ExtensionRegistry([
        Extension.create({
          name: 'bangle-io-core',
          application: {
            operations: [
              {
                name: 'operation::bangle-io-core:show-search-sidebar',
                title: 'show title bar',
              },
              {
                name: 'operation::bangle-io-core:show-search-sidebar2',
                title: 'show title bar',
              },
            ],
            operationHandler() {
              return {
                handle(operation) {
                  operationsReceived.push(operation);
                  switch (operation.name) {
                    case 'operation::bangle-io-core:show-search-sidebar': {
                      operationMatch();

                      return true;
                    }
                    default: {
                      return false;
                    }
                  }
                },
              };
            },
          },
        }),
      ]);

    let dispatchSOp: ReturnType<
      typeof useSerialOperationContext
    >['dispatchSerialOperation'];

    useSliceStateMock.mockImplementation(() => ({
      sliceState: { extensionRegistry: initExtensionRegistry() },
      store: {} as any,
      dispatch: () => {},
    }));

    function DispatchSOp() {
      let obj = useSerialOperationContext();
      dispatchSOp = obj.dispatchSerialOperation;

      return null;
    }
    act(() => {
      render(
        <ExtensionRegistryContextProvider>
          <SerialOperationContextProvider>
            <DispatchSOp />
            <ApplicationComponents />
          </SerialOperationContextProvider>
        </ExtensionRegistryContextProvider>,
      );
    });

    expect(operationMatch).toBeCalledTimes(0);

    act(() => {
      dispatchSOp({ name: 'operation::bangle-io-core:show-search-sidebar' });
    });

    expect(operationMatch).toBeCalledTimes(1);

    act(() => {
      dispatchSOp({ name: 'operation::bangle-io-core:show-search-sidebar2' });
    });

    expect(operationMatch).toBeCalledTimes(1);

    expect(operationsReceived).toMatchInlineSnapshot(`
      Array [
        Object {
          "name": "operation::bangle-io-core:show-search-sidebar",
        },
        Object {
          "name": "operation::bangle-io-core:show-search-sidebar2",
        },
      ]
    `);
  });
});
