import React from 'react';

import {
  ActionButton,
  ButtonContent,
  TooltipWrapper,
} from '@bangle.io/ui-bangle-button';
import { CloseIcon, SecondaryEditorIcon } from '@bangle.io/ui-components';
import { cx } from '@bangle.io/utils';
import { removeExtension, resolvePath } from '@bangle.io/ws-path';

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

  let p = path.split('/');

  if (p.length > MAX_ENTRIES) {
    p = p.slice(-1 * MAX_ENTRIES);
    p.unshift('…');
  }

  return (
    <div className="flex flex-row justify-between w-full B-editorbar_wrapper ">
      <div
        aria-label="note path"
        className={cx(
          'flex flex-row flex-wrap text-xs cursor-pointer transition-colors px-2 rounded B-editorbar_ws-path lg:text-sm text-ellipsis hover:underline',
          isActive && 'BU_active',
        )}
        onClick={openNotesPalette}
      >
        {p.map((r, i) => (
          <React.Fragment key={i}>
            <span className="break-all select-none">{r}</span>
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
