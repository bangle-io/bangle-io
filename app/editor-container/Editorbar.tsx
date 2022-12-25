import React from 'react';

import { vars } from '@bangle.io/atomic-css';
import { TONE, Tone } from '@bangle.io/constants';
import {
  ActionButton,
  ButtonContent,
  TooltipWrapper,
} from '@bangle.io/ui-bangle-button';
import {
  BUTTON_VARIANT,
  ButtonV2,
  CloseIcon,
  SecondaryEditorIcon,
} from '@bangle.io/ui-components';
import { removeExtension, resolvePath } from '@bangle.io/ws-path';

const MAX_ENTRIES = 3;

export function Editorbar({
  isActive,
  isSplitEditorOpen,
  onClose,
  onEnableEditing,
  onPressSecondaryEditor,
  openNotesPalette,
  showSplitEditor = false,
  wsPath,
  editingDisabled,
}: {
  isActive: boolean;
  isSplitEditorOpen: boolean;
  onClose: () => void;
  onPressSecondaryEditor: () => void;
  openNotesPalette: () => void;
  onEnableEditing: () => void;
  editingDisabled?: boolean;
  showSplitEditor?: boolean;
  wsPath: string;
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
    <div
      data-testid="app-editor-container_editorbar"
      className="flex flex-row justify-between w-full px-2 py-1 lg:px-4"
      style={{
        backgroundColor: vars.color.app.editorBg,
      }}
    >
      <ButtonV2
        ariaLabel="note path"
        text={path}
        size="xs"
        className={isActive ? 'BU_active' : ''}
        tone={TONE.SECONDARY}
        variant={!isActive ? BUTTON_VARIANT.TRANSPARENT : BUTTON_VARIANT.SOFT}
        onPress={openNotesPalette}
      />

      {editingDisabled && (
        <ButtonV2
          ariaLabel="enable editing"
          text="Enable Editing"
          className="mx-2"
          size="xs"
          tone={TONE.PROMOTE}
          onPress={onEnableEditing}
        />
      )}
      <div className="flex flex-row flex-1"></div>
      <div className="flex flex-row">
        {showSplitEditor && (
          <ActionButton
            isQuiet="hoverBg"
            onPress={onPressSecondaryEditor}
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
