import '../style';

import type { Story } from '@storybook/react';
import React from 'react';

import { Item, Section, Select } from './Select';

export default {
  title: 'ui-components/Select',
  component: Select,

  argTypes: {},
};

const Template: Story<Parameters<typeof Select>[0]> = (args) => {
  return (
    <Select label="Favorite Animal" {...args}>
      <Item key="red panda">Red Panda</Item>
      <Item key="cat">Cat</Item>
      <Item key="dog">Dog</Item>
      <Item key="aardvark">Aardvark</Item>
      <Item key="kangaroo">Really really really really big Kangaroo</Item>
      <Item key="snake">Snake</Item>
    </Select>
  );
};

export const BasicExample = Template.bind({});

BasicExample.args = {
  size: 'medium',
};

export const DisabledKeys = Template.bind({});

DisabledKeys.args = {
  disabledKeys: ['aardvark', 'kangaroo'],
};

const Template2: Story<Parameters<typeof Select>[0]> = (args) => {
  return (
    <Select label="Companies" {...args}>
      <Section title="Companies">
        <Item key="Chatterbridge">Chatterbridge</Item>
        <Item key="tagchat">Tagchat</Item>
        <Item>Yambee</Item>
        <Item>Photobug</Item>
        <Item>Livepath</Item>
      </Section>
      <Section title="People">
        <Item>Theodor Dawber</Item>
        <Item>Dwight Stollenberg</Item>
        <Item>Maddalena Prettjohn</Item>
        <Item>Maureen Fassan</Item>
        <Item>Abbie Binyon</Item>
      </Section>
    </Select>
  );
};

export const SectionExample = Template2.bind({});

SectionExample.args = {
  size: 'medium',
};

export const ControlledState: Story<Parameters<typeof Select>[0]> = () => {
  // putting it to null initially keeps the component in controlled state
  const [selected, setSelected] = React.useState<string | null>(null);

  return (
    <Select
      label="Favorite Animal"
      selectedKey={selected}
      onSelectionChange={(r) => {
        if (typeof r === 'string') {
          setSelected(r);
        }
      }}
    >
      <Item key="red panda">Red Panda</Item>
      <Item key="cat">Cat</Item>
      <Item key="dog">Dog</Item>
      <Item key="aardvark">Aardvark</Item>
      <Item key="kangaroo">Really really really really big Kangaroo</Item>
      <Item key="snake">Snake</Item>
    </Select>
  );
};
