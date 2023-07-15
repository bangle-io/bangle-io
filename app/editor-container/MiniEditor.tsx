import React, { useCallback, useState } from 'react';

import { useNsmStore } from '@bangle.io/bangle-store-context';
import { EditorDisplayType, MINI_EDITOR_INDEX } from '@bangle.io/constants';
import { vars } from '@bangle.io/css-vars';
import { Editor } from '@bangle.io/editor';
import {
  nsmSliceWorkspace,
  pushOpenedWsPaths,
} from '@bangle.io/nsm-slice-workspace';
import type { EternalVars, WsPath } from '@bangle.io/shared-types';
import { nsmPageSlice } from '@bangle.io/slice-page';
import {
  ArrowsExpand,
  Button,
  ChevronDownIcon,
  ChevronUpIcon,
  CloseIcon,
} from '@bangle.io/ui-components';
import { resolvePath } from '@bangle.io/ws-path';

export function MiniEditor({
  wsPath,
  eternalVars,
}: {
  wsPath: WsPath;
  eternalVars: EternalVars;
}) {
  const { fileNameWithoutExt } = resolvePath(wsPath, true);

  const nsmStore = useNsmStore([nsmPageSlice, nsmSliceWorkspace]);
  const [isMinimized, updateIsMinimized] = useState(false);

  const onClose = useCallback(() => {
    nsmStore.dispatch(
      pushOpenedWsPaths((oPaths) => oPaths.updateMiniEditorWsPath(undefined)),
    );
  }, [nsmStore]);

  const onExpand = useCallback(() => {
    nsmStore.dispatch(
      pushOpenedWsPaths((oPaths) => oPaths.updateMiniEditorWsPath(undefined)),
    );
    nsmStore.dispatch(
      pushOpenedWsPaths((oPaths) => {
        const result = oPaths.updatePrimaryWsPath(wsPath);

        return result;
      }),
    );
  }, [wsPath, nsmStore]);

  return (
    <div
      data-testid="editor-container_mini-editor-wrapper"
      // setting width and height are important otherwise
      // tippy confuses and causes issue with scroll
      className="fixed flex flex-col bottom-0 right-8 rounded drop-shadow-xl z-popup border-neutral"
      style={{
        width: vars.misc.miniEditorWidth,
        background: vars.misc.editorBg,
      }}
    >
      <div className="flex flex-row w-full px-2 py-1 text-sm justify-between border-b-1 border-colorNeutralBorder">
        <div
          className="font-semibold flex items-center flex-grow cursor-pointer truncate select-none"
          onClick={() => {
            updateIsMinimized((e) => !e);
          }}
        >
          <span className="truncate">{fileNameWithoutExt}</span>
        </div>
        <div className="flex flex-row">
          {isMinimized ? (
            <Button
              size="xs"
              variant="transparent"
              ariaLabel="Maximize"
              onPress={() => {
                updateIsMinimized((e) => !e);
              }}
              leftIcon={<ChevronUpIcon />}
            />
          ) : (
            <Button
              size="xs"
              variant="transparent"
              ariaLabel="Minimize"
              leftIcon={<ChevronDownIcon />}
              onPress={() => {
                updateIsMinimized((e) => !e);
              }}
            />
          )}
          <Button
            variant="transparent"
            size="xs"
            onPress={onExpand}
            ariaLabel={'Expand to full screen'}
            leftIcon={<ArrowsExpand />}
          />
          <Button
            variant="transparent"
            size="xs"
            onPress={onClose}
            ariaLabel={'Close'}
            leftIcon={<CloseIcon />}
          />
        </div>
      </div>
      {isMinimized ? null : (
        <div
          className="px-2 overflow-y-auto pl-6 B-editor-container_mini-editor"
          style={{
            height: 'min(50vh, 600px)',
          }}
        >
          <Editor
            editorDisplayType={EditorDisplayType.Floating}
            editorId={MINI_EDITOR_INDEX}
            eternalVars={eternalVars}
            wsPath={wsPath}
          />
        </div>
      )}
    </div>
  );
}
