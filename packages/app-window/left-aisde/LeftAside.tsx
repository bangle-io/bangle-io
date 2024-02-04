import {
  ActionMenu,
  Flex,
  Image,
  Item,
  ListView,
  Text,
  ToggleButton,
  View,
} from '@adobe/react-spectrum';
import { useStore, useTrack } from '@nalanda/react';
import File from '@spectrum-icons/illustrations/File';
import Folder from '@spectrum-icons/illustrations/Folder';
import Delete from '@spectrum-icons/workflow/Delete';
import Edit from '@spectrum-icons/workflow/Edit';
import MarginRightIcon from '@spectrum-icons/workflow/MarginRight';
import React from 'react';

import { sliceUI } from '@bangle.io/slice-ui';

export function LeftAside() {
  const { widescreen } = useTrack(sliceUI);
  const store = useStore();

  return (
    <ListView
      selectionMode="single"
      selectionStyle="highlight"
      width="100%"
      aria-label="ListView example with complex items"
      onAction={(key) => alert(`Triggering action on item ${key}`)}
    >
      <Item key="1" textValue="Utilities" hasChildItems>
        <ActionMenu>
          <Item key="edit" textValue="Edit">
            <Edit />
            <Text>Edit</Text>
          </Item>
          <Item key="delete" textValue="Delete">
            <Delete />
            <Text>Delete</Text>
          </Item>
        </ActionMenu>
        <Text>Utilities</Text>
      </Item>
      <Item key="2" textValue="Glasses Dog">
        <Image
          src="https://random.dog/1a0535a6-ca89-4059-9b3a-04a554c0587b.jpg"
          alt="Shiba Inu with glasses"
        />
        <Text>Glasses Dog</Text>
        <Text slot="description">JPG</Text>
        <ActionMenu>
          <Item key="edit" textValue="Edit">
            <Edit />
            <Text>Edit</Text>
          </Item>
          <Item key="delete" textValue="Delete">
            <Delete />
            <Text>Delete</Text>
          </Item>
        </ActionMenu>
      </Item>
      <Item key="3" textValue="readme">
        <File />
        <Text>readme.txt</Text>
        <Text slot="description">TXT</Text>
        <ActionMenu>
          <Item key="edit" textValue="Edit">
            <Edit />
            <Text>Edit</Text>
          </Item>
          <Item key="delete" textValue="Delete">
            <Delete />
            <Text>Delete</Text>
          </Item>
        </ActionMenu>
      </Item>
      <Item key="4" textValue="Onboarding">
        <File />
        <Text>Onboarding</Text>
        <Text slot="description">PDF</Text>
        <ActionMenu>
          <Item key="edit" textValue="Edit">
            <Edit />
            <Text>Edit</Text>
          </Item>
          <Item key="delete" textValue="Delete">
            <Delete />
            <Text>Delete</Text>
          </Item>
        </ActionMenu>
      </Item>
    </ListView>
  );
}
