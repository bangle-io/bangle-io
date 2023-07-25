import '../style';

import { Item, Section } from '@react-stately/collections';
import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import { Select } from './Select';

const meta: Meta<typeof Select> = {
  title: 'ui-components/Select',
  component: Select,
  argTypes: {},
  decorators: [],
};

export default meta;

type Story = StoryObj<typeof Select>;

const commonChildren = [
  <Item textValue="red" key="red panda">
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
];

export const BasicExample: Story = {
  args: {
    size: 'md',
    label: 'Favorite Animal',
    children: commonChildren,
  },
};

export const DisabledKeys: Story = {
  args: {
    disabledKeys: ['aardvark', 'kangaroo'],
    label: 'Favorite Animal',
    children: commonChildren,
  },
};

export const fullWidth: Story = {
  args: {
    size: 'md',
    label: 'Favorite Animal',
    className: 'w-full',
    children: [
      <Item textValue="red" key="red panda">
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
        Really really really really big Kangaroo Kangaroo
      </Item>,
      <Item textValue="snake" key="snake">
        Snake
      </Item>,
    ],
  },
};

export const SectionExample: Story = {
  args: {
    size: 'md',
    label: 'Companies',
    children: [
      <Section title="Companies">
        <Item textValue="Chatterbridge" key="Chatterbridge">
          Chatterbridge
        </Item>
        <Item textValue="tagchat" key="tagchat">
          Tagchat
        </Item>
        <Item textValue="Yambee">Yambee</Item>
        <Item textValue="Photobug">Photobug</Item>
        <Item textValue="Livepath">Livepath</Item>
      </Section>,
      <Section title="People">
        <Item textValue="Theodor">Theodor Dawber</Item>
        <Item textValue="Dwight">Dwight Stollenberg</Item>
        <Item textValue="Maddalena">Maddalena Prettjohn</Item>
        <Item textValue="Maureen">Maureen Fassan</Item>
        <Item textValue="Abbie">Abbie Binyon</Item>
      </Section>,
    ],
  },
};

function ControlledStateWrapper() {
  // putting it to null initially keeps the component in controlled state
  const [selected, setSelected] = React.useState<string | null>(null);

  return (
    <div className="" style={{ width: '70vw' }}>
      <Select
        label="Favorite Animal"
        selectedKey={selected}
        onSelectionChange={(r) => {
          if (typeof r === 'string') {
            setSelected(r);
          }
        }}
      >
        <Item textValue="red" key="red panda">
          Red Panda
        </Item>
        <Item textValue="cat" key="cat">
          Cat
        </Item>
        <Item textValue="dog" key="dog">
          Dog
        </Item>
        <Item textValue="aardvark" key="aardvark">
          Aardvark
        </Item>
        <Item textValue="kangaroo" key="kangaroo">
          Really really really really big Kangaroo
        </Item>
        <Item textValue="snake" key="snake">
          Snake
        </Item>
      </Select>
    </div>
  );
}

export const ControlledState: Story = {
  render: () => <ControlledStateWrapper />,
};
