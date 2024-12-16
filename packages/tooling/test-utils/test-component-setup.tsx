import {
  CoreServiceProvider,
  LoggerProvider,
  PlatformServiceProvider,
  RouterContext,
} from '@bangle.io/context';
import type { CoreServices, PlatformServices } from '@bangle.io/types';
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
      };

      const platformServices: PlatformServices = {
        database: services.database,
        errorService: services.errorService,
        fileStorage: {
          [services.fileStorageMemory.workspaceType]:
            services.fileStorageMemory,
        },
        router: services.router,
        syncDatabase: services.syncDatabase,
      };

      const Wrapper = ({ children }: { children: React.ReactNode }) => {
        return (
          <LoggerProvider logger={testEnv.logger}>
            <Provider store={testEnv.commonOpts.store}>
              <PlatformServiceProvider services={platformServices}>
                <CoreServiceProvider services={coreServices}>
                  <Sidebar.SidebarProvider open={false} setOpen={() => {}}>
                    <RouterContext>{children}</RouterContext>
                  </Sidebar.SidebarProvider>
                </CoreServiceProvider>
              </PlatformServiceProvider>
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
