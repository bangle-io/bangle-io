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
    <div className="w-full editor-container_editor-bar flex flex-row justify-between">
      <div className="editor-container_ws-path text-xs lg:text-sm overflow-ellipsis flex flex-row flex-wrap">
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
            isRounded={true}
            bgOnHover={true}
            className="lg:mr-1"
            isActive={isSplitEditorActive}
          >
            {<SecondaryEditorIcon className="h-3 w-3 lg:h-4 lg:w-4" />}
          </Button>
        )}
        <Button onPress={onClose} bgOnHover={true} isRounded={true}>
          {<CloseIcon className="h-3 w-3 lg:h-4 lg:w-4" />}
        </Button>
      </div>
    </div>
  );
}
