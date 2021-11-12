import React, { useCallback } from 'react';

import type { DispatchActionType } from '@bangle.io/action-context';
import { CORE_PALETTES_TOGGLE_NOTES_PALETTE } from '@bangle.io/constants';
import { ActionButton, TooltipWrapper } from '@bangle.io/ui-bangle-button';
import { ButtonContent } from '@bangle.io/ui-bangle-button/ButtonContent';
import { CloseIcon, SecondaryEditorIcon } from '@bangle.io/ui-components';
import { removeMdExtension } from '@bangle.io/utils';
import { resolvePath } from '@bangle.io/ws-path';

const MAX_ENTRIES = 3;
export function EditorBar({
  dispatchAction,
  showSplitEditor = false,
  wsPath,
  onClose,
  onPressSecondaryEditor,
  isSplitEditorActive,
}: {
  dispatchAction: DispatchActionType;
  showSplitEditor?: boolean;
  wsPath: string;
  onClose: () => void;
  onPressSecondaryEditor: () => void;
  isSplitEditorActive: boolean;
}) {
  let path = removeMdExtension(resolvePath(wsPath).filePath);

  let p = path.split('/');
  if (p.length > MAX_ENTRIES) {
    p = p.slice(-1 * MAX_ENTRIES);
    p.unshift('…');
  }

  const openNotesPalette = useCallback(() => {
    dispatchAction({
      name: CORE_PALETTES_TOGGLE_NOTES_PALETTE,
    });
  }, [dispatchAction]);

  return (
    <div className="flex flex-row justify-between w-full editor-container_editor-bar">
      <div
        aria-label="note path"
        className="flex flex-row flex-wrap text-xs cursor-pointer editor-container_ws-path lg:text-sm overflow-ellipsis hover:underline"
        onClick={openNotesPalette}
      >
        {p.map((r, i) => (
          <React.Fragment key={i}>
            <span className="break-all">{r}</span>
            {i !== p.length - 1 && (
              <span className="select-none" style={{ padding: '0 1px' }}>
                /
              </span>
            )}
          </React.Fragment>
        ))}
      </div>
      <div className="flex flex-row">
        {showSplitEditor && (
          <ActionButton
            isQuiet="hoverBg"
            onPress={onPressSecondaryEditor}
            styling={{}}
            className="lg:mr-1"
            ariaLabel="Split screen"
            isActive={isSplitEditorActive}
            tooltip={
              <TooltipWrapper>
                {isSplitEditorActive ? 'Close split screen' : 'Split screen'}
              </TooltipWrapper>
            }
            tooltipPlacement="bottom"
            tooltipXOffset={10}
          >
            <ButtonContent size="small" icon={<SecondaryEditorIcon />} />
          </ActionButton>
        )}
        <ActionButton
          isQuiet="hoverBg"
          ariaLabel="Close"
          onPress={onClose}
          styling={{}}
        >
          <ButtonContent size="small" icon={<CloseIcon />} />
        </ActionButton>
      </div>
    </div>
  );
}
