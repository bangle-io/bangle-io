import React, { useCallback, useState } from 'react';

import { useBangleStoreContext, workspace } from '@bangle.io/api';
import { EditorDisplayType, MINI_EDITOR_INDEX } from '@bangle.io/constants';
import { vars } from '@bangle.io/css-vars';
import { Editor } from '@bangle.io/editor';
import { useExtensionRegistryContext } from '@bangle.io/extension-registry';
import {
  ArrowsExpand,
  Button,
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
    <div
      data-testid="editor-container_mini-editor-wrapper"
      // setting width and height are important otherwise
      // tippy confuses and causes issue with scroll
      className="fixed flex flex-col bottom-0 right-8 rounded drop-shadow-xl bg-colorAppEditorBg z-popup border-neutral"
      style={{
        width: vars.misc.miniEditorWidth,
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
            extensionRegistry={extensionRegistry}
            wsPath={wsPath}
          />
        </div>
      )}
    </div>
  );
}
