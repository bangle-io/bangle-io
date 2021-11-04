import React from 'react';

import { Activitybar } from '@bangle.io/activitybar';
import { PRIMARY_SCROLL_PARENT_ID } from '@bangle.io/constants';
import { useExtensionRegistryContext } from '@bangle.io/extension-registry';
import { useUIManagerContext } from '@bangle.io/ui-context';
import { Dhancha } from '@bangle.io/ui-dhancha';
import { cx } from '@bangle.io/utils';
import { useWorkspaceContext } from '@bangle.io/workspace-context';
import { WorkspaceSidebar } from '@bangle.io/workspace-sidebar';

import { Changelog } from './changelog/Changelog';
import { NotificationArea } from './components/NotificationArea';
import { ApplicationComponents } from './extension-glue/ApplicationComponents';
import { PaletteManager } from './extension-glue/PaletteManager';
import { Routes } from './Routes';

export function AppContainer() {
  const { widescreen } = useUIManagerContext();
  const { wsName, primaryWsPath, secondaryWsPath } = useWorkspaceContext();
  const secondaryEditor = widescreen && Boolean(secondaryWsPath);
  const extensionRegistry = useExtensionRegistryContext();

  const sidebars = extensionRegistry.getSidebars();

  const { sidebar } = useUIManagerContext();
  const currentSidebar = sidebar
    ? sidebars.find((s) => s.name === sidebar)
    : null;

  return (
    <>
      <Changelog />
      <ApplicationComponents />
      <PaletteManager />
      <Dhancha
        widescreen={widescreen}
        activitybar={
          <Activitybar
            wsName={wsName}
            primaryWsPath={primaryWsPath}
            sidebars={sidebars}
          />
        }
        noteSidebar={undefined}
        workspaceSidebar={
          currentSidebar && (
            <WorkspaceSidebar wsName={wsName} sidebar={currentSidebar} />
          )
        }
        mainContent={[
          {
            key: 'first',
            reactNode: (
              <div
                id={cx(
                  widescreen && !secondaryEditor && PRIMARY_SCROLL_PARENT_ID,
                )}
                className={cx(
                  'main-content',
                  widescreen ? 'widescreen' : 'smallscreen',
                  secondaryEditor && 'has-secondary-editor',
                )}
              >
                <Routes />
              </div>
            ),
          },
        ]}
      />
      <NotificationArea />
    </>
  );
}
