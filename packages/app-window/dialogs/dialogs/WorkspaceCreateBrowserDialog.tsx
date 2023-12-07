import {
  Button,
  ButtonGroup,
  Content,
  Dialog,
  Divider,
  Footer,
  Form,
  Header,
  Heading,
  Link,
  Text,
  TextField,
  useDialogContainer,
} from '@adobe/react-spectrum';
import { useStore } from '@nalanda/react';
import React from 'react';

import { WorkspaceType } from '@bangle.io/constants';
import { AppDialog } from '@bangle.io/dialog-maker';
import { getWindowStoreConfig } from '@bangle.io/lib-window-common';
import { sliceWorkspaces } from '@bangle.io/misc-slices';
import { APP_DIALOG_NAME } from '@bangle.io/slice-ui';

type DialogProps = Extract<
  AppDialog,
  { name: (typeof APP_DIALOG_NAME)['workspaceCreateBrowser'] }
>;

export function WorkspaceCreateBrowserDialog({ name }: DialogProps) {
  const dialog = useDialogContainer();
  const store = useStore();
  const { eternalVars } = getWindowStoreConfig(store);

  const [wsName, updateWsName] = React.useState<string>('');

  const onConfirm = () => {
    void eternalVars.appDatabase.createWorkspaceInfo({
      metadata: {},
      name: wsName,
      type: WorkspaceType.Browser,
    });
    dialog.dismiss();
  };

  return (
    <Dialog>
      <Heading>New Workspace</Heading>
      <Divider />
      <ButtonGroup>
        <Button variant="secondary" onPress={() => dialog.dismiss()}>
          Cancel
        </Button>
        <Button
          autoFocus
          variant="accent"
          isDisabled={!wsName}
          onPress={(e) => {
            if (!wsName) {
              return;
            }
            onConfirm();
          }}
        >
          Create
        </Button>
      </ButtonGroup>
      <Content>
        <Form
          isRequired
          validationBehavior="native"
          onSubmit={(e) => {
            e.preventDefault();
            if (!wsName) {
              return;
            }
            onConfirm();
          }}
        >
          <TextField
            label="Workspace Name"
            autoFocus
            isRequired
            onChange={updateWsName}
            value={wsName}
          />
        </Form>
      </Content>
      <Footer>
        <Link target="_blank" href="https://bangle.io/privacy">
          Your data stays with you
        </Link>
      </Footer>
    </Dialog>
  );
}
