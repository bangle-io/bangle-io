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
import { useStore, useTrack } from '@nalanda/react';
import React from 'react';

import { AppDialog } from '@bangle.io/dialog-maker';
import { slicePage } from '@bangle.io/slice-page';
import { APP_DIALOG_NAME } from '@bangle.io/slice-ui';
import { sliceWorkspace } from '@bangle.io/slice-workspace';
import { locationHelpers, resolvePath, toFSPath } from '@bangle.io/ws-path';

type DialogProps = Extract<
  AppDialog,
  { name: (typeof APP_DIALOG_NAME)['fileConfirmDelete'] }
>;

export function FileConfirmDeleteDialog({ payload, name }: DialogProps) {
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const { dismiss } = useDialogContainer();
  const store = useStore();
  const { wsPath } = payload;
  const { workspace } = useTrack(sliceWorkspace);
  const { openedWsPath } = useTrack(slicePage);

  return (
    <Dialog>
      <Heading>Are you sure?</Heading>
      <Divider />
      <Content>
        <Text>
          You are about to delete the file {'"'}
          <b>{toFSPath(wsPath)}</b>
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
            if (openedWsPath.has(wsPath)) {
              store.dispatch(
                slicePage.actions.goTo(
                  locationHelpers.goToWorkspaceHome(wsPath),
                ),
              );
            }
            dismiss();
            void workspace?.deleteFile(wsPath);
          }}
        >
          Delete
        </Button>
      </ButtonGroup>
    </Dialog>
  );
}
