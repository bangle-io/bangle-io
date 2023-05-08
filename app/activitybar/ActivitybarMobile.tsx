import React from 'react';

import { vars } from '@bangle.io/api';
import { useNsmSlice, useNsmSliceState } from '@bangle.io/bangle-store-context';
import { CorePalette } from '@bangle.io/constants';
import { useExtensionRegistryContext } from '@bangle.io/extension-registry';
import { nsmSliceWorkspace } from '@bangle.io/nsm-slice-workspace';
import type { WsName } from '@bangle.io/shared-types';
import {
  nsmEditorManagerSlice,
  toggleEditingDirect,
  useNsmEditorManagerState,
} from '@bangle.io/slice-editor-manager';
import { goToWorkspaceHome, nsmPageSlice } from '@bangle.io/slice-page';
import { nsmUI, nsmUISlice } from '@bangle.io/slice-ui';
import { Button, ChevronLeftIcon } from '@bangle.io/ui-components';
import { resolvePath } from '@bangle.io/ws-path';

import { ActivitybarOptionsDropdown } from './ActivitybarOptionsDropdown';

export function ActivitybarMobile() {
  const extensionRegistry = useExtensionRegistryContext();
  const { wsName, primaryWsPath } = useNsmSliceState(nsmSliceWorkspace);

  const { editingAllowed: showDone } = useNsmEditorManagerState();

  return (
    <ActivitybarMobileDumb
      primaryWsPath={primaryWsPath}
      wsName={wsName}
      showDone={showDone}
      extensionRegistry={extensionRegistry}
    />
  );
}

export function ActivitybarMobileDumb({
  primaryWsPath,
  wsName,
  showDone,
  extensionRegistry,
}: {
  primaryWsPath: string | undefined;
  wsName: WsName | undefined;
  showDone: boolean;
  extensionRegistry: ReturnType<typeof useExtensionRegistryContext>;
}) {
  const { sidebar: activeSidebar } = useNsmSliceState(nsmUISlice);

  const [, pageDispatch] = useNsmSlice(nsmPageSlice);
  const [, uiDispatch] = useNsmSlice(nsmUISlice);
  const [editorState, editorDispatch] = useNsmSlice(nsmEditorManagerSlice);

  const operationKeybindings =
    extensionRegistry.getSerialOperationKeybindingMapping();

  const sidebarItems = extensionRegistry.getSidebars().filter((r) => {
    return r.activitybarIconShow ? r.activitybarIconShow(wsName) : true;
  });

  return (
    <>
      <div
        data-testid="app-activitybar_activitybar-mobile"
        style={{
          backgroundColor: vars.misc.activitybarBg,
        }}
        className="flex flex-row px-2 items-center w-full select-none"
      >
        <div className="flex flex-row items-center flex-none">
          {primaryWsPath ? (
            <Button
              variant="transparent"
              ariaLabel="Go home"
              size="md"
              leftIcon={<ChevronLeftIcon />}
              onPress={() => {
                if (wsName) {
                  pageDispatch(
                    goToWorkspaceHome({
                      wsName,
                    }),
                  );
                }
              }}
            />
          ) : null}
        </div>

        <div
          className="flex flex-row items-center shrink overflow-hidden"
          role="button"
        >
          <Button
            variant="transparent"
            ariaLabel="files palette"
            size="md"
            text={
              primaryWsPath
                ? resolvePath(primaryWsPath).fileNameWithoutExt
                : wsName || 'bangle-io'
            }
            onPress={() => {
              uiDispatch(nsmUI.togglePalette(CorePalette.Notes));
            }}
          />
        </div>
        <div className="flex flex-1"></div>
        <div className="flex flex-row items-center flex-none">
          {primaryWsPath && (
            <div className="mr-2">
              {showDone ? (
                <Button
                  variant="solid"
                  tone="promote"
                  ariaLabel="done editing"
                  className="capitalize"
                  size="sm"
                  text="Done"
                  onPress={() => {
                    toggleEditingDirect(editorState, editorDispatch, {
                      focusOrBlur: true,
                      editingAllowed: false,
                    });
                  }}
                />
              ) : (
                <Button
                  variant="solid"
                  ariaLabel={'edit'}
                  className="capitalize"
                  size="sm"
                  text="edit"
                  onPress={() => {
                    toggleEditingDirect(editorState, editorDispatch, {
                      focusOrBlur: true,
                      editingAllowed: true,
                    });
                  }}
                />
              )}
            </div>
          )}

          <div className="mr-2">
            <ActivitybarOptionsDropdown
              operationKeybindings={operationKeybindings}
              sidebarItems={sidebarItems}
              activeSidebar={activeSidebar || undefined}
              widescreen={false}
            />
          </div>
        </div>
      </div>
    </>
  );
}
