import React from 'react';

import { useBangleStoreContext, vars } from '@bangle.io/api';
import { CorePalette } from '@bangle.io/constants';
import { useExtensionRegistryContext } from '@bangle.io/extension-registry';
import {
  toggleEditing,
  useEditorManagerContext,
} from '@bangle.io/slice-editor-manager';
import { togglePaletteType, useUIManagerContext } from '@bangle.io/slice-ui';
import {
  goToWsNameRoute,
  useWorkspaceContext,
} from '@bangle.io/slice-workspace';
import { Button, ChevronLeftIcon } from '@bangle.io/ui-components';
import { resolvePath } from '@bangle.io/ws-path';

import { ActivitybarOptionsDropdown } from './ActivitybarOptionsDropdown';

export function ActivitybarMobile() {
  const extensionRegistry = useExtensionRegistryContext();
  const bangleStore = useBangleStoreContext();
  const { wsName, openedWsPaths } = useWorkspaceContext();
  const { primaryWsPath } = openedWsPaths;

  const { editingAllowed: showDone } = useEditorManagerContext();
  const { sidebar: activeSidebar } = useUIManagerContext();

  return (
    <ActivitybarMobileDumb
      bangleStore={bangleStore}
      primaryWsPath={primaryWsPath}
      wsName={wsName}
      showDone={showDone}
      extensionRegistry={extensionRegistry}
      activeSidebar={activeSidebar}
    />
  );
}

export function ActivitybarMobileDumb({
  bangleStore,
  primaryWsPath,
  wsName,
  showDone,
  extensionRegistry,
  activeSidebar,
}: {
  bangleStore: ReturnType<typeof useBangleStoreContext>;
  primaryWsPath: string | undefined;
  wsName: string | undefined;
  showDone: boolean;
  extensionRegistry: ReturnType<typeof useExtensionRegistryContext>;
  activeSidebar: ReturnType<typeof useUIManagerContext>['sidebar'];
}) {
  const operationKeybindings =
    extensionRegistry.getSerialOperationKeybindingMapping();

  const sidebarItems = extensionRegistry.getSidebars().filter((r) => {
    return r.activitybarIconShow
      ? r.activitybarIconShow(wsName, bangleStore.state)
      : true;
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
                goToWsNameRoute(resolvePath(primaryWsPath).wsName, {
                  reopenPreviousEditors: false,
                  replace: false,
                })(bangleStore.state, bangleStore.dispatch);
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
              togglePaletteType(CorePalette.Notes)(
                bangleStore.state,
                bangleStore.dispatch,
              );
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
                    toggleEditing({
                      focusOrBlur: true,
                      editingAllowed: false,
                    })(bangleStore.state, bangleStore.dispatch);
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
                    toggleEditing({
                      focusOrBlur: true,
                      editingAllowed: true,
                    })(bangleStore.state, bangleStore.dispatch);
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
