import React, { useMemo } from 'react';

import type { NoteSidebarWidget } from '@bangle.io/shared-types';
import {
  ActionButton,
  ButtonContent,
  TooltipWrapper,
} from '@bangle.io/ui-bangle-button';
import { ChevronRightIcon, MoreSmallListIcon } from '@bangle.io/ui-components';

export function NoteSidebar({
  onDismiss,
  widgets,
}: {
  onDismiss: () => void;
  widgets: NoteSidebarWidget[];
}) {
  return (
    <div className="flex flex-col flex-grow h-full overflow-y-scroll note-sidebar">
      <div className="flex flex-row justify-between px-2 mt-2">
        <span className="font-bold self-center">Widgets</span>
        <span>
          <ActionButton
            isQuiet="hoverBg"
            onPress={onDismiss}
            ariaLabel={'hide'}
            tooltip={<TooltipWrapper>Hide</TooltipWrapper>}
            tooltipDelay={250}
            tooltipPlacement="bottom"
          >
            <ButtonContent icon={<ChevronRightIcon />}></ButtonContent>
          </ActionButton>
        </span>
      </div>

      <div>
        {widgets.map((r) => (
          <div key={r.name} className="note-sidebar_widget-container">
            <div className="note-sidebar_widget-titlebar flex flex-row justify-between px-2 mt-2">
              <span className="ml-1 font-semibold">{r.title}</span>
              <div>
                {/* <ActionButton
                  isQuiet="hoverBg"
                  onPress={() => {}}
                  ariaLabel={'options'}
                >
                  <ButtonContent icon={<MoreSmallListIcon />}></ButtonContent>
                </ActionButton> */}
              </div>
            </div>
            <div className="note-sidebar_widget-content flex flex-col rounded-md p-1 mx-2 mt-1 overflow-y-auto">
              <r.ReactComponent />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
