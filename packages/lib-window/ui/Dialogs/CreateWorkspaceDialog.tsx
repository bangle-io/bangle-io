import {
  ActionButton,
  Button,
  ButtonGroup,
  Checkbox,
  Content,
  Dialog,
  DialogTrigger,
  Divider,
  Form,
  Header,
  Heading,
  Text,
  TextField,
  useDialogContainer,
} from '@adobe/react-spectrum';
import React from 'react';

type CreateWorkspaceDialogProps = {
  onConfirm: (options: { wsName: string }) => void;
};

export function CreateWorkspaceDialog({
  onConfirm,
}: CreateWorkspaceDialogProps) {
  let dialog = useDialogContainer();

  const [wsName, updateWsName] = React.useState<string>('');

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
            onConfirm({
              wsName,
            });
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
            onConfirm({
              wsName,
            });
          }}
        >
          <TextField
            label="Name"
            autoFocus
            isRequired
            onChange={updateWsName}
            value={wsName}
          />
        </Form>
      </Content>
    </Dialog>
  );
}
