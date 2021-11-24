import React, { useMemo } from 'react';

import type { BangleEditor } from '@bangle.dev/core';

import {
  ActionButton,
  ButtonContent,
  TooltipWrapper,
} from '@bangle.io/ui-bangle-button';
import { ChevronRightIcon } from '@bangle.io/ui-components';

export function NoteSidebar({
  onDismiss,
  focusedEditor,
}: {
  onDismiss: () => void;
  focusedEditor?: {
    editor: BangleEditor;
    wsPath: string;
  };
}) {
  const items = useMemo(() => {
    if (!focusedEditor || focusedEditor.editor.destroyed) {
      return [];
    }
    const editor = focusedEditor.editor;

    const headingNodes: Array<{
      offset: number;
      level: number;
      title: string;
    }> = [];
    editor.view.state.doc.forEach((node, offset, i) => {
      if (node.type.name === 'heading') {
        headingNodes.push({
          offset,
          level: node.attrs.level,
          title: node.textContent,
        });
      }
    });

    return headingNodes.map((r, i) => {
      return {
        uid: i + 'heading',
        title: r.title,
        extraInfo: '#' + r.level,
        data: r,
      };
    });
  }, [focusedEditor]);

  return (
    <div className="flex flex-col flex-grow h-full overflow-y-scroll workspace-sidebar">
      <div className="flex flex-row justify-between px-2 mt-2">
        <div className="font-bold">Widgets</div>
        <div>
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
        </div>
      </div>

      <div>
        {items.map((r) => (
          <div key={r.uid}>{r.title}</div>
        ))}
      </div>
    </div>
  );
}
