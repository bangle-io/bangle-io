import type { CoreServices } from '@bangle.io/context';
import { CoreServiceProvider, LoggerProvider } from '@bangle.io/context';
import { Sidebar } from '@bangle.io/ui-components';
import { type RenderResult, render } from '@testing-library/react';
import { Provider } from 'jotai/react';
import React from 'react';
import { createTestEnvironment } from './test-service-setup';

export function renderWithServices({
  testEnvArgs = {},
}: {
  testEnvArgs?: Parameters<typeof createTestEnvironment>[0];
} = {}) {
  const testEnv = createTestEnvironment(testEnvArgs);

  return {
    autoMountServices: async () => {
      testEnv.setDefaultConfig();
      const instance = testEnv.instantiateAll();
      await testEnv.mountAll();
      return instance;
    },

    mountComponent: ({
      ui,
      services,
    }: {
      ui: React.ReactNode;
      services: ReturnType<typeof testEnv.instantiateAll>;
    }): {
      result: RenderResult;
      rerender: (ui: React.ReactNode) => void;
    } => {
      const coreServices: CoreServices = {
        commandDispatcher: services.commandDispatcher,
        commandRegistry: services.commandRegistry,
        fileSystem: services.fileSystem,
        navigation: services.navigation,
        shortcut: services.shortcut,
        editorService: services.editorService,
        workbench: services.workbench,
        workbenchState: services.workbenchState,
        workspace: services.workspace,
        workspaceOps: services.workspaceOps,
        workspaceState: services.workspaceState,
        userActivityService: services.userActivityService,
        pmEditorService: services.pmEditorService,
      };

      const Wrapper = ({ children }: { children: React.ReactNode }) => {
        return (
          <LoggerProvider logger={testEnv.logger}>
            <Provider store={testEnv.commonOpts.store}>
              <CoreServiceProvider services={coreServices}>
                <Sidebar.SidebarProvider open={false} setOpen={() => {}}>
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
