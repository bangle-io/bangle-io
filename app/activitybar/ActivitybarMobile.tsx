import React from 'react';

import { useBangleStoreContext } from '@bangle.io/api';
import { CorePalette } from '@bangle.io/constants';
import { useExtensionRegistryContext } from '@bangle.io/extension-registry';
import {
  someEditorHasFocus,
  toggleEditing,
} from '@bangle.io/slice-editor-manager';
import { togglePaletteType, useUIManagerContext } from '@bangle.io/slice-ui';
import { useWorkspaceContext } from '@bangle.io/slice-workspace';
import { ActionButton, ButtonContent } from '@bangle.io/ui-bangle-button';
import { FileDocumentIcon } from '@bangle.io/ui-components';
import { resolvePath } from '@bangle.io/ws-path';

import { ActivitybarButton } from './ActivitybarButton';
import { ActivitybarOptionsDropdown } from './ActivitybarOptionsDropdown';

export function ActivitybarMobile() {
  const extensionRegistry = useExtensionRegistryContext();
  const bangleStore = useBangleStoreContext();
  const operationKeybindings =
    extensionRegistry.getSerialOperationKeybindingMapping();
  const { wsName, openedWsPaths } = useWorkspaceContext();
  const { primaryWsPath } = openedWsPaths;

  const sidebarItems = extensionRegistry.getSidebars().filter((r) => {
    return r.activitybarIconShow
      ? r.activitybarIconShow(wsName, bangleStore.state)
      : true;
  });
  const { sidebar: activeSidebar } = useUIManagerContext();

  const showDone = someEditorHasFocus()(bangleStore.state);

  return (
    <>
      <div className="flex flex-row px-3 align-center B-activitybar_activitybar w-full">
        <div className="flex flex-row items-center flex-none">
          <ActivitybarButton
            hint="See files palette"
            widescreen={false}
            onPress={() => {
              togglePaletteType(CorePalette.Notes)(
                bangleStore.state,
                bangleStore.dispatch,
              );
            }}
            icon={<FileDocumentIcon className="w-5 h-5" />}
          />
        </div>
        <div
          className="flex flex-row items-center flex-none"
          onClick={() => {
            togglePaletteType(CorePalette.Notes)(
              bangleStore.state,
              bangleStore.dispatch,
            );
          }}
        >
          <span className="font-semibold mr-2">
            {primaryWsPath
              ? resolvePath(primaryWsPath).fileNameWithoutExt
              : wsName || 'bangle-io'}
          </span>
        </div>
        <div className="flex flex-1"></div>
        <div className="flex flex-row items-center flex-none">
          <div className="mr-2">
            <ActionButton
              ariaLabel={showDone ? 'done editing' : 'edit'}
              className="capitalize"
              variant={showDone ? 'primary' : 'secondary'}
              onPress={() => {
                toggleEditing({ focusOrBlur: true })(
                  bangleStore.state,
                  bangleStore.dispatch,
                );
              }}
            >
              <ButtonContent
                textClassName="font-bold"
                text={showDone ? 'done' : 'edit'}
              />
            </ActionButton>
          </div>

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
