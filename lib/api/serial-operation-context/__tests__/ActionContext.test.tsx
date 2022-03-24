/**
 * @jest-environment jsdom
 */
import { act, render } from '@testing-library/react';
import React, { useState } from 'react';

import { defaultSpecs } from '@bangle.dev/all-base-components';

import { useSliceState } from '@bangle.io/bangle-store-context';
import {
  CORE_PALETTES_TOGGLE_NOTES_PALETTE,
  CORE_PALETTES_TOGGLE_OPERATION_PALETTE,
} from '@bangle.io/constants';
import {
  Extension,
  ExtensionRegistry,
  ExtensionRegistryContextProvider,
  useExtensionRegistryContext,
} from '@bangle.io/extension-registry';
import type { DispatchSerialOperationType } from '@bangle.io/shared-types';

import { useSerialOperationContext } from '../SerialOperationContext';
import { SerialOperationContextProvider } from '../SerialOperationContextProvider';
import { useSerialOperationHandler } from '../use-register-operation-handler';

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
      case CORE_PALETTES_TOGGLE_OPERATION_PALETTE: {
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
          name: '@bangle.io/core-palettes',
          application: {
            ReactComponent: TestHandler,
            operations: [
              {
                name: CORE_PALETTES_TOGGLE_OPERATION_PALETTE,
                title: 'show title bar',
              },
              {
                name: CORE_PALETTES_TOGGLE_NOTES_PALETTE,
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
      dispatchSOp: DispatchSerialOperationType;

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
      dispatchSOp({
        name: CORE_PALETTES_TOGGLE_OPERATION_PALETTE,
      });
    });

    expect(result?.container.innerHTML.includes('result-1')).toBe(true);

    act(() => {
      dispatchSOp({ name: CORE_PALETTES_TOGGLE_NOTES_PALETTE });
    });

    expect(result?.container.innerHTML.includes('result-1')).toBe(true);
  });

  test('operation handler works', async () => {
    let operationMatch = jest.fn();
    let operationsReceived: any[] = [];
    const initExtensionRegistry = () =>
      new ExtensionRegistry([
        Extension.create({
          name: '@bangle.io/core-palettes',
          application: {
            operations: [
              {
                name: CORE_PALETTES_TOGGLE_OPERATION_PALETTE,
                title: 'show title bar',
              },
              {
                name: CORE_PALETTES_TOGGLE_NOTES_PALETTE,
                title: 'show title bar',
              },
            ],
            operationHandler() {
              return {
                handle(operation) {
                  operationsReceived.push(operation);
                  switch (operation.name) {
                    case CORE_PALETTES_TOGGLE_OPERATION_PALETTE: {
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

    let dispatchSOp: DispatchSerialOperationType<{
      name: 'operation::test-boo:sample-operation';
    }>;

    useSliceStateMock.mockImplementation(() => ({
      sliceState: { extensionRegistry: initExtensionRegistry() },
      store: {} as any,
      dispatch: () => {},
    }));

    function DispatchSOp() {
      let obj = useSerialOperationContext<{
        name: 'operation::test-boo:sample-operation';
      }>();
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
      dispatchSOp({
        name: CORE_PALETTES_TOGGLE_OPERATION_PALETTE,
      });
    });

    expect(operationMatch).toBeCalledTimes(1);

    act(() => {
      dispatchSOp({ name: 'operation::test-boo:sample-operation' });
    });

    expect(operationMatch).toBeCalledTimes(1);

    expect(operationsReceived).toMatchInlineSnapshot(`
      Array [
        Object {
          "name": "operation::@bangle.io/core-palettes:TOGGLE_OPERATION_PALETTE",
        },
        Object {
          "name": "operation::test-boo:sample-operation",
        },
      ]
    `);
  });
});
