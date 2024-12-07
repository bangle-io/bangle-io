import type { Meta, StoryObj } from '@storybook/react';
import {
  Calculator,
  Calendar,
  CreditCard,
  Settings,
  Smile,
  User,
} from 'lucide-react';
import React from 'react';
import {
  CommandBadge,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from './command';
import {
  type Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogTitle,
  DialogTrigger,
} from './dialog';
import { DialogSingleSelect } from './dialog-single-select';
import { Input } from './input';
import { Label } from './label';

const meta: Meta<typeof DialogSingleSelect> = {
  title: 'DialogSingleSelect',
  component: DialogSingleSelect,
};

export default meta;
type Story = StoryObj<typeof DialogSingleSelect>;

const Template: Story = {
  args: {
    open: true,
    setOpen: () => {},
    options: [
      { id: 'option1', title: 'option1' },
      { id: 'Option 2', title: 'option2' },
      { id: 'Option 3', title: 'option3' },
    ],
    onSelect: () => {},
    placeholder: 'Select an option',
  },
};

export const Default: Story = {
  ...Template,
};

export const DefaultBadge: Story = {
  ...Template,
  args: {
    ...Template.args,
    badgeText: 'Issues',
  },
};

export const DestructiveBadge: Story = {
  ...Template,
  args: {
    ...Template.args,
    badgeText: 'Issues',
    badgeTone: 'destructive',
    open: true,
  },
};

export const WithHint: Story = {
  ...Template,
  args: {
    ...Template.args,
    hints: ['Press ↵ to confirm your selection.', 'Press Esc to close.'],
  },
};
