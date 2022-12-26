import React from 'react';

import type { SidebarType } from '@bangle.io/extension-registry';
import {
  ButtonV2,
  ChevronLeftIcon,
  CloseIcon,
  ErrorBoundary,
} from '@bangle.io/ui-components';

export function WorkspaceSidebar({
  onDismiss,
  sidebar,
  widescreen,
}: {
  onDismiss: () => void;
  sidebar: SidebarType;
  widescreen: boolean;
}) {
  return (
    <div
      data-testid="app-workspace-sidebar_workspace-sidebar"
      className="flex flex-col flex-grow h-full smallscreen:min-h-screen overflow-y-scroll bg-colorNeutralBgLayerTop"
    >
      <div className="flex flex-row justify-between px-2 mt-2">
        <span className="font-bold self-center">{sidebar.title}</span>
        <span>
          <ButtonV2
            variant="transparent"
            onPress={onDismiss}
            size="sm"
            ariaLabel={'Hide ' + sidebar.title}
            tooltipPlacement="bottom"
            leftIcon={widescreen ? <ChevronLeftIcon /> : <CloseIcon />}
          />
        </span>
      </div>
      <ErrorBoundary>
        <sidebar.ReactComponent />
      </ErrorBoundary>
    </div>
  );
}
