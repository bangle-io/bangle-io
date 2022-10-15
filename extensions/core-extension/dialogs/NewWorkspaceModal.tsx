import React from 'react';

import { useBangleStoreContext } from '@bangle.io/bangle-store-context';
import {
  NEW_BROWSER_WORKSPACE_DIALOG_NAME,
  NEW_NATIVE_FS_WORKSPACE_DIALOG_NAME,
} from '@bangle.io/constants';
import { useExtensionRegistryContext } from '@bangle.io/extension-registry';
import type { DialogComponentType } from '@bangle.io/shared-types';
import { showDialog } from '@bangle.io/slice-ui';

import { StorageType } from './common';
import { PickWorkspaceType } from './PickWorkspaceType';

export const NewWorkspaceModal: DialogComponentType = (props) => {
  const bangleStore = useBangleStoreContext();

  const extensionRegistry = useExtensionRegistryContext();

  return (
    <PickWorkspaceType
      isGithubShown={extensionRegistry.isExtensionDefined(
        '@bangle.io/github-storage',
      )}
      onDismiss={() => {
        props.onDismiss(props.dialogName);
      }}
      onSelect={(storage) => {
        switch (storage) {
          case StorageType.GITHUB: {
            showDialog(
              'dialog::@bangle.io/github-storage:NEW_GITHUB_WORKSPACE_TOKEN_DIALOG',
            )(bangleStore.state, bangleStore.dispatch);

            return;
          }
          case StorageType.BROWSER: {
            showDialog(NEW_BROWSER_WORKSPACE_DIALOG_NAME)(
              bangleStore.state,
              bangleStore.dispatch,
            );

            return;
          }
          case StorageType.NATIVE_FS: {
            showDialog(NEW_NATIVE_FS_WORKSPACE_DIALOG_NAME)(
              bangleStore.state,
              bangleStore.dispatch,
            );

            return;
          }
          default: {
            let val: never = storage;
            throw new Error('Unknown storage type');
          }
        }
      }}
    />
  );
};
