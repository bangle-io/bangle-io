import '../style';

import { Item, Section } from '@react-stately/collections';
import type { Story } from '@storybook/react';
import React from 'react';

import { Select } from './Select';

export default {
  title: 'ui-components/Select',
  component: Select,

  argTypes: {},
};

const Template: Story<Parameters<typeof Select>[0]> = (args) => {
  return (
    <Select label="Favorite Animal" {...args}>
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
  );
};

export const BasicExample = Template.bind({});

BasicExample.args = {
  size: 'md',
};

export const DisabledKeys = Template.bind({});

DisabledKeys.args = {
  disabledKeys: ['aardvark', 'kangaroo'],
};

const Template2: Story<Parameters<typeof Select>[0]> = (args) => {
  return (
    <Select label="Companies" {...args}>
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
      </Section>
      <Section title="People">
        <Item textValue="Theodor">Theodor Dawber</Item>
        <Item textValue="Dwight">Dwight Stollenberg</Item>
        <Item textValue="Maddalena">Maddalena Prettjohn</Item>
        <Item textValue="Maureen">Maureen Fassan</Item>
        <Item textValue="Abbie">Abbie Binyon</Item>
      </Section>
    </Select>
  );
};

export const SectionExample = Template2.bind({});

SectionExample.args = {
  size: 'md',
};

export const ControlledState: Story<Parameters<typeof Select>[0]> = () => {
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
};
