import '../style';

import { Item } from '@react-stately/collections';
import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import { ComboBox } from './ComboBox';

const meta: Meta<typeof ComboBox> = {
  title: 'ui-components/ComboBox',
  component: ComboBox,
  argTypes: {},
  decorators: [],
};

export default meta;

type Story = StoryObj<typeof ComboBox>;

export const Primary: Story = {
  args: {
    label: 'ComboBox',
    children: [
      <Item textValue="red panda" key="red panda">
        Red Panda
      </Item>,
      <Item textValue="cat" key="cat">
        Cat
      </Item>,
      <Item textValue="dog" key="dog">
        Dog
      </Item>,
      <Item textValue="aardvark" key="aardvark">
        Aardvark
      </Item>,
      <Item textValue="kangaroo" key="kangaroo">
        Really really really really big Kangaroo
      </Item>,
      <Item textValue="snake" key="snake">
        Snake
      </Item>,
    ],
  },
};

export const DisabledCase: Story = {
  args: {
    label: 'ComboBox',
    disabledKeys: ['cat', 'snake'],
    children: [
      <Item textValue="red panda" key="red panda">
        Red Panda
      </Item>,
      <Item textValue="cat" key="cat">
        Cat
      </Item>,
      <Item textValue="dog" key="dog">
        Dog
      </Item>,
      <Item textValue="aardvark" key="aardvark">
        Aardvark
      </Item>,
      <Item textValue="kangaroo" key="kangaroo">
        Really really really really big Kangaroo
      </Item>,
      <Item textValue="snake" key="snake">
        Snake
      </Item>,
    ],
  },
};

export const HalfWidth: Story = {
  render: (args) => {
    return (
      <div
        style={{
          width: '50vw',
        }}
      >
        <ComboBox {...args} />
      </div>
    );
  },
  args: {
    label: 'I am label',
    children: [
      <Item textValue="red panda" key="red panda">
        Red Panda
      </Item>,
      <Item textValue="cat" key="cat">
        Cat
      </Item>,
      <Item textValue="dog" key="dog">
        Dog
      </Item>,
      <Item textValue="aardvark" key="aardvark">
        Aardvark
      </Item>,
      <Item textValue="kangaroo" key="kangaroo">
        Really really really really big Kangaroo
      </Item>,
      <Item textValue="snake" key="snake">
        Snake
      </Item>,
    ],
  },
};
