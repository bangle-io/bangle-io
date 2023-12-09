import {
  Button,
  ButtonGroup,
  Content,
  Dialog,
  Divider,
  Heading,
  Text,
  useDialogContainer,
} from '@adobe/react-spectrum';
import { useStore } from '@nalanda/react';
import React, { useEffect } from 'react';

import { APP_ERROR_NAME, throwAppError } from '@bangle.io/app-errors';
import { requestNativeBrowserFSPermission } from '@bangle.io/baby-fs';
import { AppDialog } from '@bangle.io/dialog-maker';
import { getWindowStoreConfig } from '@bangle.io/lib-window-common';
import { slicePage } from '@bangle.io/slice-page';
import { APP_DIALOG_NAME } from '@bangle.io/slice-ui';
import { locationHelpers } from '@bangle.io/ws-path';

type DialogProps = Extract<
  AppDialog,
  { name: (typeof APP_DIALOG_NAME)['workspaceAuthNativeFS'] }
>;

export function WorkspaceAuthNativeFSDialog({ payload, name }: DialogProps) {
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const { dismiss } = useDialogContainer();
  const store = useStore();

  const { eternalVars } = getWindowStoreConfig(store);
  const { workspaceName } = payload;
  const getPermission = async () => {
    const wsInfo =
      await eternalVars.appDatabase.getWorkspaceInfo(workspaceName);

    if (!wsInfo) {
      throwAppError(
        APP_ERROR_NAME.workspaceNotFound,
        `Workspace ${workspaceName} not found in appDatabase`,
        {
          wsName: workspaceName,
        },
      );
    }

    const rootDirHandle = wsInfo.metadata.rootDirHandle;

    if (!rootDirHandle) {
      throwAppError(
        APP_ERROR_NAME.workspaceCorrupted,
        `Workspace ${workspaceName} is corrupted`,
        {
          wsName: workspaceName,
        },
      );
    }

    const granted = await requestNativeBrowserFSPermission(
      wsInfo.metadata.rootDirHandle,
    );

    if (granted) {
      store.dispatch(
        slicePage.actions.goTo((location) =>
          locationHelpers.goToWorkspaceHome(location, wsInfo.name),
        ),
      );
      dismiss();
    }
  };

  useEffect(() => {
    // this exists so we can rerender workspace home  page after grant
    store.dispatch(
      slicePage.actions.goTo((location) =>
        locationHelpers.goToWorkspaceSelection(location),
      ),
    );
  }, [store]);

  return (
    <Dialog>
      <Heading>Grant permission?</Heading>
      <Divider />
      <Content>
        <Text>
          Bangle.io needs you permission to access this <b>{workspaceName}</b>.
        </Text>
      </Content>
      <ButtonGroup>
        <Button variant="secondary" onPress={dismiss}>
          Cancel
        </Button>
        <Button
          variant="accent"
          autoFocus
          onPress={() => {
            void getPermission();
          }}
        >
          Grant
        </Button>
      </ButtonGroup>
    </Dialog>
  );
}
