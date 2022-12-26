import React from 'react';

import { ButtonV2, ChevronDoubleLeftIcon } from '@bangle.io/ui-components';

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
    <ButtonV2
      ariaLabel="Show note sidebar"
      className="fixed right-0 top-10 z-30 border-r-0"
      tooltipPlacement="bottom"
      size="sm"
      variant="soft"
      style={{
        borderTopRightRadius: 0,
        borderBottomRightRadius: 0,
      }}
      onPress={() => {
        showNoteSidebar();
      }}
      leftIcon={<ChevronDoubleLeftIcon />}
    />
  );
}
