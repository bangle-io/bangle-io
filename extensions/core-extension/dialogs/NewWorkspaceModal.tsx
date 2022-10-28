import React, { useEffect } from 'react';

import { useBangleStoreContext } from '@bangle.io/bangle-store-context';
import {
  NEW_BROWSER_WORKSPACE_DIALOG_NAME,
  NEW_NATIVE_FS_WORKSPACE_DIALOG_NAME,
  NEW_PRIVATE_FS_WORKSPACE_DIALOG_NAME,
  WorkspaceType,
} from '@bangle.io/constants';
import { useExtensionRegistryContext } from '@bangle.io/extension-registry';
import type { DialogComponentType } from '@bangle.io/shared-types';
import { showDialog } from '@bangle.io/slice-ui';
import { TriState } from '@bangle.io/tri-state';

import { PickWorkspaceType } from './PickWorkspaceType';

export const NewWorkspaceModal: DialogComponentType = (props) => {
  const bangleStore = useBangleStoreContext();

  const [isPrivateFsAvailable, setIsPrivateFsAvailable] =
    React.useState<TriState>(TriState.Unknown);

  useEffect(() => {
    let unmounted = false;

    if (
      typeof navigator !== 'undefined' &&
      'getDirectory' in navigator.storage
    ) {
      navigator.storage
        .getDirectory()
        .then(() => {
          if (unmounted) {
            return;
          }
          setIsPrivateFsAvailable(TriState.Yes);
        })
        .catch(() => {
          if (unmounted) {
            return;
          }
          setIsPrivateFsAvailable(TriState.No);
        });
    } else {
      setIsPrivateFsAvailable(TriState.No);
    }

    return () => {
      unmounted = true;
    };
  }, []);

  const extensionRegistry = useExtensionRegistryContext();

  if (isPrivateFsAvailable === TriState.Unknown) {
    return null;
  }

  return (
    <PickWorkspaceType
      hasGithub={extensionRegistry.isExtensionDefined(
        '@bangle.io/github-storage',
      )}
      hasPrivateFs={isPrivateFsAvailable === TriState.Yes}
      onDismiss={() => {
        props.onDismiss(props.dialogName);
      }}
      onSelect={(storage) => {
        switch (storage) {
          case WorkspaceType.Github: {
            showDialog(
              'dialog::@bangle.io/github-storage:NEW_GITHUB_WORKSPACE_TOKEN_DIALOG',
            )(bangleStore.state, bangleStore.dispatch);

            return;
          }
          case WorkspaceType.Browser: {
            showDialog(NEW_BROWSER_WORKSPACE_DIALOG_NAME)(
              bangleStore.state,
              bangleStore.dispatch,
            );

            return;
          }
          case WorkspaceType.NativeFS: {
            showDialog(NEW_NATIVE_FS_WORKSPACE_DIALOG_NAME)(
              bangleStore.state,
              bangleStore.dispatch,
            );

            return;
          }

          case WorkspaceType.PrivateFS: {
            showDialog(NEW_PRIVATE_FS_WORKSPACE_DIALOG_NAME)(
              bangleStore.state,
              bangleStore.dispatch,
            );

            return;
          }

          case WorkspaceType.Help: {
            throw new Error('Not allowed to create help workspace');

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
