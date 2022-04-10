import '../style';

import { Item } from '@react-stately/collections';
import type { Story } from '@storybook/react';
import React from 'react';

import { ComboBox } from './ComboBox';

export default {
  title: 'ui-components/ComboBox',
  component: ComboBox,
  argTypes: {},
};

const Template: Story<Parameters<typeof ComboBox>[0]> = (args) => {
  return <ComboBox {...args}></ComboBox>;
};

export const Primary = Template.bind({});

Primary.args = {
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
};

export const DisabledCase = Template.bind({});

DisabledCase.args = {
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
};
