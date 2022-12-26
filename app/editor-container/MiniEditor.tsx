import React, { useCallback, useState } from 'react';

import { useBangleStoreContext, workspace } from '@bangle.io/api';
import { EditorDisplayType, MINI_EDITOR_INDEX } from '@bangle.io/constants';
import { Editor } from '@bangle.io/editor';
import { useExtensionRegistryContext } from '@bangle.io/extension-registry';
import {
  ArrowsExpand,
  ButtonV2,
  ChevronDownIcon,
  ChevronUpIcon,
  CloseIcon,
} from '@bangle.io/ui-components';
import { resolvePath } from '@bangle.io/ws-path';

export function MiniEditor({ wsPath }: { wsPath: string }) {
  const { fileNameWithoutExt } = resolvePath(wsPath, true);
  const extensionRegistry = useExtensionRegistryContext();
  const bangleStore = useBangleStoreContext();

  const [isMinimized, updateIsMinimized] = useState(false);

  const onClose = useCallback(() => {
    workspace.closeMiniEditor()(bangleStore.state, bangleStore.dispatch);
  }, [bangleStore]);

  const onExpand = useCallback(() => {
    onClose();
    workspace.pushWsPath(wsPath)(bangleStore.state, bangleStore.dispatch);
  }, [wsPath, onClose, bangleStore]);

  return (
    <div className="B-editor-container_mini-editor-wrapper">
      <div
        className="flex flex-row px-2 py-1 text-sm  justify-between"
        style={{
          width: '100%',
          borderBottom: '1px solid var(--BV-window-border-color-0)',
        }}
      >
        <div
          className="font-semibold flex-grow cursor-pointer truncate select-none"
          style={{ display: 'flex', alignItems: 'center' }}
          onClick={() => {
            updateIsMinimized((e) => !e);
          }}
        >
          <span className="truncate">{fileNameWithoutExt}</span>
        </div>
        <div className="flex flex-row">
          {isMinimized ? (
            <ButtonV2
              size="xs"
              variant="transparent"
              ariaLabel="Maximize"
              onPress={() => {
                updateIsMinimized((e) => !e);
              }}
              leftIcon={<ChevronUpIcon />}
            />
          ) : (
            <ButtonV2
              size="xs"
              variant="transparent"
              ariaLabel="Minimize"
              leftIcon={<ChevronDownIcon />}
              onPress={() => {
                updateIsMinimized((e) => !e);
              }}
            />
          )}
          <ButtonV2
            variant="transparent"
            size="xs"
            onPress={onExpand}
            ariaLabel={'Expand to full screen'}
            leftIcon={<ArrowsExpand />}
          />
          <ButtonV2
            variant="transparent"
            size="xs"
            onPress={onClose}
            ariaLabel={'Close'}
            leftIcon={<CloseIcon />}
          />
        </div>
      </div>
      {isMinimized ? null : (
        <div className="px-2 overflow-y-auto pl-6 B-editor-container_mini-editor">
          <Editor
            editorDisplayType={EditorDisplayType.Floating}
            editorId={MINI_EDITOR_INDEX}
            extensionRegistry={extensionRegistry}
            wsPath={wsPath}
          />
        </div>
      )}
    </div>
  );
}
