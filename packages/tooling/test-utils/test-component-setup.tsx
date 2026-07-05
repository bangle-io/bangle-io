import { CoreServiceProvider, LoggerProvider } from '@bangle.io/context';
import { Sidebar } from '@bangle.io/ui-components';
import { type RenderResult, render } from '@testing-library/react';
import { Provider } from 'jotai/react';
import React from 'react';
import {
  createTestEnvironment,
  type TestEnvironment,
} from './test-service-setup';

type RenderWithServicesResult = {
  autoMountServices: () => Promise<
    ReturnType<TestEnvironment['instantiateAll']>
  >;
  mountComponent: (input: { ui: React.ReactNode }) => {
    result: RenderResult;
    rerender: (ui: React.ReactNode) => void;
  };
  testEnv: TestEnvironment;
};

export function renderWithServices({
  testEnvArgs = {},
}: {
  testEnvArgs?: Parameters<typeof createTestEnvironment>[0];
} = {}): RenderWithServicesResult {
  const testEnv = createTestEnvironment(testEnvArgs);

  return {
    autoMountServices: async () => {
      const instance = testEnv.instantiateAll();
      await testEnv.mountAll();
      return instance;
    },

    mountComponent: ({
      ui,
    }: {
      ui: React.ReactNode;
    }): {
      result: RenderResult;
      rerender: (ui: React.ReactNode) => void;
    } => {
      const coreServices = testEnv.coreServices();

      const Wrapper = ({ children }: { children: React.ReactNode }) => {
        return (
          <LoggerProvider logger={testEnv.logger}>
            <Provider store={testEnv.commonOpts.store}>
              <CoreServiceProvider services={coreServices}>
                <Sidebar.SidebarProvider open={false} onOpenChange={() => {}}>
                  {children}
                </Sidebar.SidebarProvider>
              </CoreServiceProvider>
            </Provider>
          </LoggerProvider>
        );
      };

      const result = render(<Wrapper>{ui}</Wrapper>);

      return {
        result,
        rerender: (ui: React.ReactNode) =>
          result.rerender(<Wrapper>{ui}</Wrapper>),
      };
    },

    testEnv,
  };
}
