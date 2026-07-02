import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from './select';

const meta: Meta<typeof Select> = {
  title: 'Select',
  component: Select,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Select>;

export const ThemePreference: Story = {
  render: () => {
    const [value, setValue] = React.useState('system');
    return (
      <Select onValueChange={setValue} value={value}>
        <SelectTrigger aria-label="Theme preference" className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end">
          <SelectItem value="system">System</SelectItem>
          <SelectItem value="light">Light</SelectItem>
          <SelectItem value="dark">Dark</SelectItem>
        </SelectContent>
      </Select>
    );
  },
};

export const Placeholder: Story = {
  render: () => (
    <Select>
      <SelectTrigger className="w-56">
        <SelectValue placeholder="Select a workspace" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="notes">Notes</SelectItem>
        <SelectItem value="journal">Journal</SelectItem>
        <SelectItem value="scratchpad">Scratchpad</SelectItem>
      </SelectContent>
    </Select>
  ),
};

export const Grouped: Story = {
  render: () => (
    <Select defaultValue="markdown">
      <SelectTrigger className="w-56">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Text</SelectLabel>
          <SelectItem value="markdown">Markdown</SelectItem>
          <SelectItem value="plain">Plain text</SelectItem>
        </SelectGroup>
        <SelectSeparator />
        <SelectGroup>
          <SelectLabel>Rich</SelectLabel>
          <SelectItem value="wysiwyg">WYSIWYG</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  ),
};
