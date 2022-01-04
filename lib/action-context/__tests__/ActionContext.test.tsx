import { act, render } from '@testing-library/react';
import React, { useEffect, useState } from 'react';

import { defaultSpecs } from '@bangle.dev/all-base-components';

import { useSliceState } from '@bangle.io/app-state-context';
import {
  Extension,
  ExtensionRegistry,
  ExtensionRegistryContextProvider,
  RegisterActionHandlerType,
  useExtensionRegistryContext,
} from '@bangle.io/extension-registry';

import { useActionContext } from '../ActionContext';
import { ActionContextProvider } from '../ActionContextProvider';

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

function TestActionHandler({
  registerActionHandler,
}: {
  registerActionHandler: RegisterActionHandlerType;
}) {
  const [sidebarCounter, updateSidebar] = useState(0);
  useEffect(() => {
    const deregister = registerActionHandler((actionObject) => {
      switch (actionObject.name) {
        case 'action::bangle-io-core:show-search-sidebar': {
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
  }, [registerActionHandler]);

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
          ReactComponent: TestActionHandler,
          actions: [
            {
              name: 'action::bangle-io-core:show-search-sidebar',
              title: 'show title bar',
            },
            {
              name: 'action::bangle-io-core:show-search-sidebar2',
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
    dispatchAction: ReturnType<typeof useActionContext>['dispatchAction'];

  function DispatchAction() {
    let obj = useActionContext();
    dispatchAction = obj.dispatchAction;
    return null;
  }

  act(() => {
    result = render(
      <ExtensionRegistryContextProvider>
        <ActionContextProvider>
          <DispatchAction />
          <ApplicationComponents />
        </ActionContextProvider>
      </ExtensionRegistryContextProvider>,
    );
  });

  expect(result.container.innerHTML.includes('result-0')).toBe(true);

  act(() => {
    dispatchAction({ name: 'action::bangle-io-core:show-search-sidebar' });
  });

  expect(result.container.innerHTML.includes('result-1')).toBe(true);

  act(() => {
    dispatchAction({ name: 'action::bangle-io-core:show-search-sidebar2' });
  });

  expect(result.container.innerHTML.includes('result-1')).toBe(true);
});
