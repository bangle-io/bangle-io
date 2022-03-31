import React from 'react';

import {
  ActionButton,
  ButtonContent,
  TooltipWrapper,
} from '@bangle.io/ui-bangle-button';
import { ChevronDoubleLeftIcon } from '@bangle.io/ui-components';

export function NoteSidebarShowButton({
  showNoteSidebar,
  widescreen,
  isNoteSidebarShown,
}: {
  showNoteSidebar: () => void;
  widescreen: boolean;
  isNoteSidebarShown: boolean;
}) {
  if (!widescreen || isNoteSidebarShown) {
    return null;
  }

  return (
    <ActionButton
      ariaLabel="show note sidebar"
      className="fixed right-0 top-10 z-30 border-r-0"
      style={{
        border: '1px solid var(--BV-window-border-color-0)',
        borderRight: 0,
        borderTopRightRadius: 0,
        borderBottomRightRadius: 0,
      }}
      tooltipPlacement="bottom"
      tooltip={<TooltipWrapper>Show note sidebar</TooltipWrapper>}
      onPress={() => {
        showNoteSidebar();
      }}
    >
      <ButtonContent icon={<ChevronDoubleLeftIcon />} />
    </ActionButton>
  );
}
