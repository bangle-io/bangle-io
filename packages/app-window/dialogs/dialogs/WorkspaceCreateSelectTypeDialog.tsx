import {
  Button,
  ButtonGroup,
  Content,
  Dialog,
  Divider,
  Footer,
  Heading,
  Item,
  Link,
  ListBox,
  Text,
} from '@adobe/react-spectrum';
import React from 'react';

import { supportsNativeBrowserFs } from '@bangle.io/baby-fs';
import { WorkspaceType } from '@bangle.io/constants';

let nativeFsSupport = supportsNativeBrowserFs();

const disabledStorageType: WorkspaceType[] = [
  !nativeFsSupport && WorkspaceType.NativeFS,
].filter((r): r is WorkspaceType => Boolean(r));

export function WorkspaceCreateSelectTypeDialog() {
  const [selectedKeys, setSelectedKeys] = React.useState<string>(
    nativeFsSupport ? WorkspaceType.NativeFS : WorkspaceType.Browser,
  );

  return (
    <Dialog>
      <Heading>Select a workspace type</Heading>
      <Divider />
      <Content>
        <ListBox
          width="size-4800"
          aria-label="Options"
          selectionMode="single"
          disabledKeys={disabledStorageType}
          selectedKeys={[selectedKeys]}
          onSelectionChange={(selection) => {
            if (selection !== 'all' && selection.size === 1) {
              setSelectedKeys(selection.values().next().value);
            }
          }}
        >
          <Item key={WorkspaceType.NativeFS} textValue="local-file-storage">
            <Text UNSAFE_className="font-bold">Local File Storage</Text>
            <Text slot="description">
              This option allows you to save notes directly to a folder of your
              choice. We recommend it as it provides complete data ownership to
              our users.
            </Text>
          </Item>
          <Item key={WorkspaceType.Browser} textValue="browser-storage">
            <Text UNSAFE_className="font-bold">Browser Storage</Text>
            <Text slot="description">
              Stores notes in your browser{"'"}s storage. A good option if you
              want to try out Bangle. However, you can lose your notes if you
              clear your browser storage.
            </Text>
          </Item>
        </ListBox>
      </Content>
      <Footer>
        <Link target="_blank" href="https://bangle.io/privacy">
          Your data stays with you
        </Link>
      </Footer>
      <ButtonGroup>
        <Button variant="secondary" onPress={close}>
          Cancel
        </Button>
        <Button variant="accent" onPress={close} autoFocus>
          Next
        </Button>
      </ButtonGroup>
    </Dialog>
  );
}
