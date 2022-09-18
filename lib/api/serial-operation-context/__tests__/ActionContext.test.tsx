/**
 * @jest-environment @bangle.io/jsdom-env
 */
import { act, render } from '@testing-library/react';
import React, { useState } from 'react';

import { defaultSpecs } from '@bangle.dev/all-base-components';

import {
  Extension,
  useExtensionRegistryContext,
} from '@bangle.io/extension-registry';
import { createBasicTestStore, TestStoreProvider } from '@bangle.io/test-utils';

import { useSerialOperationContext } from '../SerialOperationContext';
import { SerialOperationContextProvider } from '../SerialOperationContextProvider';
import { useSerialOperationHandler } from '../use-register-operation-handler';

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

describe('operation handlers', () => {
  test('works', async () => {
    const { store } = createBasicTestStore({
      useEditorCoreExtension: false,
      extensions: [
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
        }),
      ],
    });

    let result: ReturnType<typeof render> | undefined,
      dispatchSOp: ReturnType<
        typeof useSerialOperationContext
      >['dispatchSerialOperation'];

    function DispatchSOp() {
      let obj = useSerialOperationContext();
      dispatchSOp = obj.dispatchSerialOperation;

      return null;
    }
    act(() => {
      result = render(
        <TestStoreProvider bangleStore={store} bangleStoreChanged={0}>
          <SerialOperationContextProvider>
            <DispatchSOp />
            <ApplicationComponents />
          </SerialOperationContextProvider>
        </TestStoreProvider>,
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
    const { store } = createBasicTestStore({
      useEditorCoreExtension: false,
      extensions: [
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
      ],
    });

    let dispatchSOp: ReturnType<
      typeof useSerialOperationContext
    >['dispatchSerialOperation'];

    function DispatchSOp() {
      let obj = useSerialOperationContext();
      dispatchSOp = obj.dispatchSerialOperation;

      return null;
    }
    act(() => {
      render(
        <TestStoreProvider bangleStore={store} bangleStoreChanged={0}>
          <SerialOperationContextProvider>
            <DispatchSOp />
            <ApplicationComponents />
          </SerialOperationContextProvider>
        </TestStoreProvider>,
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
      [
        {
          "name": "operation::bangle-io-core:show-search-sidebar",
          "value": undefined,
        },
        {
          "name": "operation::bangle-io-core:show-search-sidebar2",
          "value": undefined,
        },
      ]
    `);
  });
});
