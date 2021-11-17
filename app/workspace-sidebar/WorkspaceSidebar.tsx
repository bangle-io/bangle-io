import React from 'react';

import type { SidebarType } from '@bangle.io/extension-registry';
import {
  ActionButton,
  ButtonContent,
  TooltipWrapper,
} from '@bangle.io/ui-bangle-button';
import {
  ChevronLeftIcon,
  ErrorBoundary,
  MoreIcon,
} from '@bangle.io/ui-components';

export function WorkspaceSidebar({
  onDismiss,
  sidebar,
}: {
  onDismiss: () => void;
  wsName?: string;
  sidebar: SidebarType;
}) {
  return (
    <div className="flex flex-col flex-grow h-full overflow-y-scroll workspace-sidebar">
      <div className="flex flex-row justify-between px-2 mt-2">
        <div className="font-bold">{sidebar.title}</div>
        <div>
          <ActionButton
            isQuiet="hoverBg"
            onPress={onDismiss}
            ariaLabel={'hide ' + sidebar.title}
            tooltip={<TooltipWrapper>Hide</TooltipWrapper>}
            tooltipDelay={250}
            tooltipPlacement="bottom"
          >
            <ButtonContent icon={<ChevronLeftIcon />}></ButtonContent>
          </ActionButton>
          {/* <ActionButton
            isQuiet="hoverBg"
            onPress={() => {}}
            ariaLabel={'view available actions'}
            tooltip={<TooltipWrapper>View available actions</TooltipWrapper>}
            tooltipDelay={250}
            tooltipPlacement="bottom"
          >
            <ButtonContent icon={<MoreIcon />}></ButtonContent>
          </ActionButton> */}
        </div>
      </div>
      <ErrorBoundary>
        <sidebar.ReactComponent />
      </ErrorBoundary>
    </div>
  );
}
