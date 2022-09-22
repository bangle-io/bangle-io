import React from 'react';

import {
  ActionButton,
  ButtonContent,
  TooltipWrapper,
} from '@bangle.io/ui-bangle-button';
import { CloseIcon, SecondaryEditorIcon } from '@bangle.io/ui-components';
import { cx } from '@bangle.io/utils';
import { removeExtension, resolvePath } from '@bangle.io/ws-path';

import { ShowNotification } from './ShowNotification';

const MAX_ENTRIES = 3;

export function Editorbar({
  showSplitEditor = false,
  wsPath,
  onClose,
  onPressSecondaryEditor,
  isSplitEditorOpen,
  isActive,
  openNotesPalette,
}: {
  isActive: boolean;
  showSplitEditor?: boolean;
  wsPath: string;
  onClose: () => void;
  onPressSecondaryEditor: () => void;
  isSplitEditorOpen: boolean;
  openNotesPalette: () => void;
}) {
  let path = removeExtension(resolvePath(wsPath).filePath);

  if (path.split('/').length > MAX_ENTRIES) {
    let p = path.split('/').slice(-1 * MAX_ENTRIES);
    p.unshift('…');
    path = p.join('/');
  }

  if (path.length > 50) {
    path = '…' + path.slice(-1 * 50);
  }

  return (
    <div className="flex flex-row justify-between w-full B-activitybar_editorbar-wrapper ">
      <div
        aria-label="note path"
        className={cx(
          'select-none flex flex-row flex-wrap text-xs cursor-pointer transition-colors px-2 rounded B-activitybar_editorbar-ws-path lg:text-sm text-ellipsis hover:underline',
          isActive && 'BU_active',
        )}
        onClick={openNotesPalette}
      >
        {path}
      </div>
      <div className="flex flex-row flex-1"></div>
      <div className="flex flex-row">
        {showSplitEditor && (
          <ActionButton
            isQuiet="hoverBg"
            onPress={onPressSecondaryEditor}
            styling={{}}
            className="lg:mr-1"
            ariaLabel="Split screen"
            isActive={isSplitEditorOpen}
            tooltip={
              <TooltipWrapper>
                {isSplitEditorOpen ? 'Close split screen' : 'Split screen'}
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
