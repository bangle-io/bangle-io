import React, { useEffect } from 'react';

import { nsmApi2 } from '@bangle.io/api';
import {
  NEW_BROWSER_WORKSPACE_DIALOG_NAME,
  NEW_NATIVE_FS_WORKSPACE_DIALOG_NAME,
  NEW_PRIVATE_FS_WORKSPACE_DIALOG_NAME,
  WorkspaceType,
} from '@bangle.io/constants';
import { useExtensionRegistryContext } from '@bangle.io/extension-registry';
import type { DialogComponentType } from '@bangle.io/shared-types';
import { TriState } from '@bangle.io/tri-state';
import { safeNavigatorStorageGetDirectory } from '@bangle.io/utils';

import { PickWorkspaceType } from './PickWorkspaceType';

export const NewWorkspaceModal: DialogComponentType = (props) => {
  const [isPrivateFsAvailable, setIsPrivateFsAvailable] =
    React.useState<TriState>(TriState.Unknown);

  useEffect(() => {
    let unmounted = false;

    safeNavigatorStorageGetDirectory().then((dir) => {
      if (unmounted) {
        return;
      }

      // setIsPrivateFsAvailable(TriState.Yes);
      // TODO private fs become buggy in safari for some reason
      setIsPrivateFsAvailable(TriState.No);
    });

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
            nsmApi2.ui.showDialog({
              dialogName:
                'dialog::@bangle.io/github-storage:NEW_GITHUB_WORKSPACE_TOKEN_DIALOG',
            });

            return;
          }
          case WorkspaceType.Browser: {
            nsmApi2.ui.showDialog({
              dialogName: NEW_BROWSER_WORKSPACE_DIALOG_NAME,
            });

            return;
          }
          case WorkspaceType.NativeFS: {
            nsmApi2.ui.showDialog({
              dialogName: NEW_NATIVE_FS_WORKSPACE_DIALOG_NAME,
            });

            return;
          }

          case WorkspaceType.PrivateFS: {
            nsmApi2.ui.showDialog({
              dialogName: NEW_PRIVATE_FS_WORKSPACE_DIALOG_NAME,
            });

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
