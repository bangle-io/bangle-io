import React from 'react';

import { useBangleStoreContext } from '@bangle.io/bangle-store-context';
import { CorePalette } from '@bangle.io/constants';
import {
  toggleEditing,
  useEditorManagerContext,
} from '@bangle.io/slice-editor-manager';
import { togglePaletteType } from '@bangle.io/slice-ui';
import {
  EditIcon,
  FileDocumentIcon,
  NoEditIcon,
} from '@bangle.io/ui-components';
import { cx } from '@bangle.io/utils';
import { resolvePath } from '@bangle.io/ws-path';

import { ActivitybarButton } from './ActivitybarButton';

export function ActivitybarMobile({
  primaryWsPath,
  wsName,
}: {
  primaryWsPath?: string;
  wsName?: string;
}) {
  const bangleStore = useBangleStoreContext();
  const { editingAllowed } = useEditorManagerContext();

  return (
    <div className="flex flex-row ml-3 text-gray-100 align-center activitybar w-full mr-3">
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
        <span>
          {primaryWsPath
            ? resolvePath(primaryWsPath).fileName
            : wsName || 'bangle-io'}
        </span>
      </div>
      <div className="flex-1"></div>
      <div className="flex flex-row items-center flex-none">
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
                fill={'var(--accent-primary-1)'}
              />
            ) : (
              <NoEditIcon className="w-5 h-5" />
            )
          }
        />
      </div>
    </div>
  );
}
