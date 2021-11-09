import React from 'react';

import { Button } from '@bangle.io/ui-bangle-button';
import { CloseIcon, SecondaryEditorIcon } from '@bangle.io/ui-components';
import { removeMdExtension } from '@bangle.io/utils';
import { resolvePath } from '@bangle.io/ws-path';

const MAX_ENTRIES = 3;
export function EditorBar({
  showSplitEditor = false,
  wsPath,
  onClose,
  onPressSecondaryEditor,
  isSplitEditorActive,
}: {
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
  return (
    <div className="flex flex-row justify-between w-full editor-container_editor-bar">
      <div className="flex flex-row flex-wrap text-xs editor-container_ws-path lg:text-sm overflow-ellipsis">
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
          <Button
            onPress={onPressSecondaryEditor}
            styling={{ bgOnHover: true, isRounded: true }}
            className="lg:mr-1"
            ariaLabel="Split screen"
            isActive={isSplitEditorActive}
          >
            {<SecondaryEditorIcon className="w-3 h-3 lg:h-4 lg:w-4" />}
          </Button>
        )}
        <Button
          ariaLabel="Close"
          onPress={onClose}
          styling={{ bgOnHover: true, isRounded: true }}
        >
          {<CloseIcon className="w-3 h-3 lg:h-4 lg:w-4" />}
        </Button>
      </div>
    </div>
  );
}
