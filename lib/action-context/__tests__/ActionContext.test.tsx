import { act, render } from '@testing-library/react';
import {
  Extension,
  ExtensionRegistry,
  ExtensionRegistryContextProvider,
  RegisterActionHandlerType,
  useExtensionRegistryContext,
} from 'extension-registry';
import React, { useEffect, useState } from 'react';

import { defaultSpecs } from '@bangle.dev/all-base-components';

import { useActionContext } from '../ActionContext';
import { ActionContextProvider } from '../ActionContextProvider';

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
        case '@action/core/show-search-sidebar': {
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

test('works', async () => {
  const initExtensionRegistry = () =>
    new ExtensionRegistry([
      Extension.create({
        name: 'core',
        application: {
          ReactComponent: TestActionHandler,
          actions: [
            {
              name: '@action/core/show-search-sidebar',
              title: 'show title bar',
            },
            {
              name: '@action/core/show-search-sidebar2',
              title: 'show title bar',
            },
          ],
        },
        editor: {
          specs: [...defaultSpecs()],
        },
      }),
    ]);

  let result,
    dispatchAction: ReturnType<typeof useActionContext>['dispatchAction'];

  function DispatchAction() {
    let obj = useActionContext();
    dispatchAction = obj.dispatchAction;
    return null;
  }
  act(() => {
    result = render(
      <ExtensionRegistryContextProvider
        initExtensionRegistry={initExtensionRegistry}
      >
        <ActionContextProvider>
          <DispatchAction />
          <ApplicationComponents />
        </ActionContextProvider>
      </ExtensionRegistryContextProvider>,
    );
  });

  expect(result.container.innerHTML.includes('result-0')).toBe(true);

  act(() => {
    dispatchAction({ name: '@action/core/show-search-sidebar' });
  });

  expect(result.container.innerHTML.includes('result-1')).toBe(true);

  act(() => {
    dispatchAction({ name: '@action/core/show-search-sidebar2' });
  });

  expect(result.container.innerHTML.includes('result-1')).toBe(true);
});
