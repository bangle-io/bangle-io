import { act, render } from '@testing-library/react';
import React, { useEffect, useState } from 'react';

import { defaultSpecs } from '@bangle.dev/all-base-components';

import { useSliceState } from '@bangle.io/app-state-context';
import {
  Extension,
  ExtensionRegistry,
  ExtensionRegistryContextProvider,
  RegisterSerialOperationHandlerType,
  useExtensionRegistryContext,
} from '@bangle.io/extension-registry';

import { useSerialOperationContext } from '../SerialOperationContext';
import { SerialOperationContextProvider } from '../SerialOperationContextProvider';

jest.mock('@bangle.io/app-state-context', () => {
  const obj = jest.requireActual('@bangle.io/app-state-context');
  return {
    ...obj,
    useSliceState: jest.fn(),
  };
});

function ApplicationComponents() {
  const extensionRegistry = useExtensionRegistryContext();
  return <>{extensionRegistry.renderApplicationComponents()}</>;
}

function TestHandler({
  registerSerialOperationHandler,
}: {
  registerSerialOperationHandler: RegisterSerialOperationHandlerType;
}) {
  const [sidebarCounter, updateSidebar] = useState(0);
  useEffect(() => {
    const deregister = registerSerialOperationHandler((operation) => {
      switch (operation.name) {
        case 'operation::bangle-io-core:show-search-sidebar': {
          updateSidebar((c) => c + 1);
          return true;
        }
        default: {
          return false;
        }
      }
    });
    return () => {
      deregister();
    };
  }, [registerSerialOperationHandler]);

  return <span>{`result-${sidebarCounter}`}</span>;
}

const useSliceStateMock = useSliceState as jest.MockedFunction<
  typeof useSliceState
>;

beforeEach(() => {
  useSliceStateMock.mockImplementation(() => ({} as any));
});

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

  useSliceStateMock.mockImplementation(() => ({
    sliceState: { extensionRegistry: initExtensionRegistry() },
    store: {} as any,
  }));

  let result,
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
      <ExtensionRegistryContextProvider>
        <SerialOperationContextProvider>
          <DispatchSOp />
          <ApplicationComponents />
        </SerialOperationContextProvider>
      </ExtensionRegistryContextProvider>,
    );
  });

  expect(result.container.innerHTML.includes('result-0')).toBe(true);

  act(() => {
    dispatchSOp({ name: 'operation::bangle-io-core:show-search-sidebar' });
  });

  expect(result.container.innerHTML.includes('result-1')).toBe(true);

  act(() => {
    dispatchSOp({ name: 'operation::bangle-io-core:show-search-sidebar2' });
  });

  expect(result.container.innerHTML.includes('result-1')).toBe(true);
});
