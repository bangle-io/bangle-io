import React from 'react';

import type { NoteSidebarWidget } from '@bangle.io/shared-types';
import {
  ActionButton,
  ButtonContent,
  TooltipWrapper,
} from '@bangle.io/ui-bangle-button';
import { ButtonV2, ChevronRightIcon } from '@bangle.io/ui-components';

export function NoteSidebar({
  onDismiss,
  widgets,
}: {
  onDismiss: () => void;
  widgets: NoteSidebarWidget[];
}) {
  return (
    <div className="flex flex-col flex-grow h-full overflow-y-scroll B-note-sidebar_note-sidebar">
      <div className="flex flex-row justify-between px-2 mt-2">
        <span className="font-bold self-center">Widgets</span>
        <span>
          <ButtonV2
            size="sm"
            variant="transparent"
            onPress={onDismiss}
            ariaLabel={'hide'}
            tooltipPlacement="bottom"
            leftIcon={<ChevronRightIcon />}
          />
        </span>
      </div>

      <div>
        {widgets.map((r) => (
          <div key={r.name} className="">
            <div className="flex flex-row justify-between px-2 mt-2">
              <span className="ml-1 font-semibold">{r.title}</span>
              <div></div>
            </div>
            <div className="B-note-sidebar_widget-content flex flex-col rounded-md p-1 mx-2 mt-1 overflow-y-auto">
              <r.ReactComponent />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
