import React, { useCallback } from 'react';

import { useBangleStoreContext } from '@bangle.io/app-state-context';
import { toggleNotesPalette } from '@bangle.io/core-operations';
import {
  ActionButton,
  ButtonContent,
  TooltipWrapper,
} from '@bangle.io/ui-bangle-button';
import { CloseIcon, SecondaryEditorIcon } from '@bangle.io/ui-components';
import { cx, removeMdExtension } from '@bangle.io/utils';
import { resolvePath } from '@bangle.io/ws-path';

const MAX_ENTRIES = 3;
export function EditorBar({
  showSplitEditor = false,
  wsPath,
  onClose,
  onPressSecondaryEditor,
  isSplitEditorOpen,
  isActive,
}: {
  isActive: boolean;
  showSplitEditor?: boolean;
  wsPath: string;
  onClose: () => void;
  onPressSecondaryEditor: () => void;
  isSplitEditorOpen: boolean;
}) {
  let path = removeMdExtension(resolvePath(wsPath).filePath);
  const bangleStore = useBangleStoreContext();
  let p = path.split('/');
  if (p.length > MAX_ENTRIES) {
    p = p.slice(-1 * MAX_ENTRIES);
    p.unshift('…');
  }

  const openNotesPalette = useCallback(() => {
    toggleNotesPalette()(bangleStore.state, bangleStore.dispatch);
  }, [bangleStore]);

  return (
    <div className="flex flex-row justify-between w-full editor-container_editor-bar">
      <div
        aria-label="note path"
        className={cx(
          'flex flex-row flex-wrap text-xs cursor-pointer transition-colors px-2 rounded editor-container_ws-path lg:text-sm overflow-ellipsis hover:underline',
          isActive && 'active',
        )}
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
            allowFocus={false}
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
          allowFocus={false}
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
