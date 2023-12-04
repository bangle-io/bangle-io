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
import React from 'react';

import { AppDialog } from '@bangle.io/dialog-maker';
import { getWindowStoreConfig } from '@bangle.io/lib-common';
import { sliceWorkspaces } from '@bangle.io/misc-slices';
import { APP_DIALOG_NAME } from '@bangle.io/slice-ui';

type DialogProps = Extract<
  AppDialog,
  { name: (typeof APP_DIALOG_NAME)['workspaceConfirmDelete'] }
>;

export function WorkspaceConfirmDeleteDialogComponent({
  payload,
  name,
}: DialogProps) {
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const { dismiss } = useDialogContainer();
  const store = useStore();
  const { eternalVars } = getWindowStoreConfig(store);
  const { workspaceName } = payload;
  return (
    <Dialog>
      <Heading>Are you sure?</Heading>
      <Divider />
      <Content>
        <Text>
          You are about to delete the workspace {'"'}
          <b>{workspaceName}</b>
          {'"'}. This action is irreversible.
        </Text>
      </Content>
      <ButtonGroup>
        <Button variant="secondary" onPress={dismiss} autoFocus>
          Cancel
        </Button>
        <Button
          variant="negative"
          onPress={() => {
            void eternalVars.appDatabase
              .deleteWorkspaceInfo(workspaceName)
              .then(() => {
                store.dispatch(sliceWorkspaces.refreshWorkspaces());
              });
            dismiss();
          }}
        >
          {/*  */}
          Delete
        </Button>
      </ButtonGroup>
    </Dialog>
  );
}
