import React from 'react';

import { useBangleStoreContext } from '@bangle.io/api';
import { CorePalette } from '@bangle.io/constants';
import { useExtensionRegistryContext } from '@bangle.io/extension-registry';
import {
  toggleEditing,
  useEditorManagerContext,
} from '@bangle.io/slice-editor-manager';
import { togglePaletteType, useUIManagerContext } from '@bangle.io/slice-ui';
import {
  goToWorkspaceHomeRoute,
  useWorkspaceContext,
} from '@bangle.io/slice-workspace';
import { ActionButton, ButtonContent } from '@bangle.io/ui-bangle-button';
import { ChevronLeftIcon } from '@bangle.io/ui-components';
import { resolvePath } from '@bangle.io/ws-path';

import { ActivitybarButton } from './ActivitybarButton';
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
      <div className="flex flex-row px-2 align-center B-activitybar_activitybar w-full">
        <div className="flex flex-row items-center flex-none">
          {primaryWsPath ? (
            <ActivitybarButton
              hint="Go home"
              widescreen={false}
              className="mr-1"
              onPress={() => {
                goToWorkspaceHomeRoute({ replace: false })(
                  bangleStore.state,
                  bangleStore.dispatch,
                );
              }}
              icon={<ChevronLeftIcon className="w-6 h-6" />}
            />
          ) : null}
        </div>

        <div
          className="flex flex-row items-center shrink overflow-hidden"
          role="button"
        >
          <ActionButton
            ariaLabel={'files palette'}
            isQuiet
            variant={'secondary'}
            className="min-w-0 truncate"
            onPress={() => {
              togglePaletteType(CorePalette.Notes)(
                bangleStore.state,
                bangleStore.dispatch,
              );
            }}
          >
            <ButtonContent
              textClassName="font-bold min-w-0 truncate"
              text={
                primaryWsPath
                  ? resolvePath(primaryWsPath).fileNameWithoutExt
                  : wsName || 'bangle-io'
              }
            />
          </ActionButton>
        </div>
        <div className="flex flex-1"></div>
        <div className="flex flex-row items-center flex-none">
          {primaryWsPath && (
            <div className="mr-2">
              {showDone ? (
                <ActionButton
                  ariaLabel={'done editing'}
                  className="capitalize"
                  variant={'primary'}
                  onPress={() => {
                    toggleEditing({
                      focusOrBlur: true,
                      editingAllowed: false,
                    })(bangleStore.state, bangleStore.dispatch);
                  }}
                >
                  <ButtonContent textClassName="font-bold" text={'done'} />
                </ActionButton>
              ) : (
                <ActionButton
                  ariaLabel={'edit'}
                  className="capitalize"
                  variant={'secondary'}
                  onPress={() => {
                    toggleEditing({
                      focusOrBlur: true,
                      editingAllowed: true,
                    })(bangleStore.state, bangleStore.dispatch);
                  }}
                >
                  <ButtonContent textClassName="font-bold" text={'edit'} />
                </ActionButton>
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
