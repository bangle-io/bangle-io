import React from 'react';

import type { SidebarType } from '@bangle.io/extension-registry';
import {
  ActionButton,
  ButtonContent,
  TooltipWrapper,
} from '@bangle.io/ui-bangle-button';
import {
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
      data-testId="app-workspace-sidebar_workspace-sidebar"
      className="flex flex-col flex-grow h-full overflow-y-scroll bg-colorNeutralBgLayerTop"
    >
      <div className="flex flex-row justify-between px-2 mt-2">
        <span className="font-bold self-center">{sidebar.title}</span>
        <span>
          <ActionButton
            isQuiet="hoverBg"
            onPress={onDismiss}
            ariaLabel={'hide ' + sidebar.title}
            tooltip={<TooltipWrapper>Hide</TooltipWrapper>}
            tooltipDelay={250}
            tooltipPlacement="bottom"
          >
            <ButtonContent
              icon={widescreen ? <ChevronLeftIcon /> : <CloseIcon />}
            />
          </ActionButton>
        </span>
      </div>
      <ErrorBoundary>
        <sidebar.ReactComponent />
      </ErrorBoundary>
    </div>
  );
}
