import React, { useCallback, useState } from 'react';

import type { BangleEditor as CoreBangleEditor } from '@bangle.dev/core';

import { useSerialOperationContext, workspace } from '@bangle.io/api';
import { EditorDisplayType, MINI_EDITOR_INDEX } from '@bangle.io/constants';
import { Editor } from '@bangle.io/editor';
import { useExtensionRegistryContext } from '@bangle.io/extension-registry';
import type { EditorIdType } from '@bangle.io/slice-editor-manager';
import {
  setEditorReady,
  setEditorUnmounted,
  useEditorManagerContext,
} from '@bangle.io/slice-editor-manager';
import {
  ActionButton,
  ButtonContent,
  TooltipWrapper,
} from '@bangle.io/ui-bangle-button';
import {
  ArrowsExpand,
  ChevronDownIcon,
  ChevronUpIcon,
  CloseIcon,
} from '@bangle.io/ui-components';
import { resolvePath } from '@bangle.io/ws-path';

export function MiniEditor({ wsPath }: { wsPath: string }) {
  const { fileNameWithoutExt } = resolvePath(wsPath, true);
  const { bangleStore } = useEditorManagerContext();
  const { dispatchSerialOperation } = useSerialOperationContext();
  const extensionRegistry = useExtensionRegistryContext();

  const [isMinimized, updateIsMinimized] = useState(false);

  const getDocument = useCallback(
    (wsPath: string) => {
      return workspace
        .getNote(wsPath)(bangleStore.state, bangleStore.dispatch, bangleStore)
        .then(
          (doc) => {
            return doc;
          },
          (err) => {
            return undefined;
          },
        );
    },
    [bangleStore],
  );

  const onEditorReady = useCallback(
    (editor: CoreBangleEditor, editorId: EditorIdType) => {
      if (wsPath) {
        setEditorReady(
          editorId,
          wsPath,
          editor,
        )(bangleStore.state, bangleStore.dispatch);
      }
    },
    [wsPath, bangleStore],
  );

  const onClose = useCallback(() => {
    workspace.closeMiniEditor()(bangleStore.state, bangleStore.dispatch);
  }, [bangleStore]);

  const onExpand = useCallback(() => {
    onClose();
    workspace.pushWsPath(wsPath)(bangleStore.state, bangleStore.dispatch);
  }, [wsPath, onClose, bangleStore]);

  const onEditorUnmount = useCallback(
    (editor: CoreBangleEditor, editorId: EditorIdType) => {
      setEditorUnmounted(editorId, editor)(
        bangleStore.state,
        bangleStore.dispatch,
      );
    },
    [bangleStore],
  );

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
            <ActionButton
              isQuiet="hoverBg"
              ariaLabel="Maximize"
              onPress={() => {
                updateIsMinimized((e) => !e);
              }}
            >
              <ButtonContent size="small" icon={<ChevronUpIcon />} />
            </ActionButton>
          ) : (
            <ActionButton
              isQuiet="hoverBg"
              ariaLabel="Minimize"
              onPress={() => {
                updateIsMinimized((e) => !e);
              }}
            >
              <ButtonContent size="small" icon={<ChevronDownIcon />} />
            </ActionButton>
          )}
          <ActionButton
            isQuiet="hoverBg"
            ariaLabel="Expand to full screen"
            onPress={onExpand}
            tooltip={<TooltipWrapper>Expand to full screen</TooltipWrapper>}
          >
            <ButtonContent size="small" icon={<ArrowsExpand />} />
          </ActionButton>
          <ActionButton
            isQuiet="hoverBg"
            ariaLabel="Close"
            onPress={onClose}
            tooltip={<TooltipWrapper>Close</TooltipWrapper>}
          >
            <ButtonContent size="small" icon={<CloseIcon />} />
          </ActionButton>
        </div>
      </div>
      {isMinimized ? null : (
        <div className="px-2 overflow-y-auto pl-6 B-editor-container_mini-editor">
          <Editor
            editorDisplayType={EditorDisplayType.Popup}
            editorId={MINI_EDITOR_INDEX}
            extensionRegistry={extensionRegistry}
            wsPath={wsPath}
          />
        </div>
      )}
    </div>
  );
}
