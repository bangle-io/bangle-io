import React from 'react';

import { CorePalette, PRIMARY_EDITOR_INDEX } from '@bangle.io/constants';
import type { SidebarType } from '@bangle.io/extension-registry';
import type {
  BangleApplicationStore,
  SerialOperationKeybindingMapping,
} from '@bangle.io/shared-types';
import { toggleEditing } from '@bangle.io/slice-editor-manager';
import { getEditorIssue } from '@bangle.io/slice-notification';
import { togglePaletteType } from '@bangle.io/slice-ui';
import {
  EditIcon,
  FileDocumentIcon,
  NoEditIcon,
} from '@bangle.io/ui-components';
import { resolvePath } from '@bangle.io/ws-path';

import { ActivitybarButton } from './ActivitybarButton';
import { ActivitybarOptionsDropdown } from './ActivitybarOptionsDropdown';
import { EditorIssueButton } from './EditorIssueButton';

export function ActivitybarMobile({
  activeSidebar,
  bangleStore,
  editingAllowed,
  operationKeybindings,
  primaryWsPath,
  sidebarItems,
  wsName,
}: {
  activeSidebar?: string;
  bangleStore: BangleApplicationStore;
  editingAllowed: boolean;
  operationKeybindings: SerialOperationKeybindingMapping;
  primaryWsPath?: string;
  sidebarItems?: SidebarType[];
  wsName?: string;
}) {
  const editorIssue =
    primaryWsPath && getEditorIssue(primaryWsPath)(bangleStore.state);

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
        <div className="flex flex-1 items-center justify-center">
          {editorIssue && (
            <EditorIssueButton editorIssue={editorIssue} widescreen={false} />
          )}
        </div>
        <div className="flex flex-row items-center flex-none">
          <div className="mr-2">
            <ActivitybarButton
              hint={editingAllowed ? 'Disable edit' : 'Enable edit'}
              widescreen={false}
              onPress={() => {
                toggleEditing()(bangleStore.state, bangleStore.dispatch);
              }}
              icon={
                editingAllowed ? (
                  <EditIcon
                    className={'w-5 h-5'}
                    fill={'var(--BV-accent-primary-0)'}
                  />
                ) : (
                  <NoEditIcon className="w-5 h-5" />
                )
              }
            />
          </div>

          <div className="mr-2">
            <ActivitybarOptionsDropdown
              operationKeybindings={operationKeybindings}
              sidebarItems={sidebarItems}
              activeSidebar={activeSidebar}
              widescreen={false}
            />
          </div>
        </div>
      </div>
    </>
  );
}
