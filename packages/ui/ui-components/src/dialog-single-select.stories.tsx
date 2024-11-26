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
export function Default() {
  return (
    <DialogSingleSelect
      open={true}
      setOpen={() => {}}
      options={[
        { id: 'option1', title: 'option1' },
        { id: 'Option 2', title: 'option2' },
        { id: 'Option 3', title: 'option3' },
      ]}
      onSelect={() => {}}
      placeholder="Select an option"
    />
  );
}

export function DefaultBadge() {
  return (
    <DialogSingleSelect
      open={true}
      setOpen={() => {}}
      options={[
        { id: 'option1', title: 'option1' },
        { id: 'Option 2', title: 'option2' },
        { id: 'Option 3', title: 'option3' },
      ]}
      onSelect={() => {}}
      placeholder="Select an option"
      badgeText="Issues"
    />
  );
}

export function DestructiveBadge() {
  return (
    <DialogSingleSelect
      open={true}
      setOpen={() => {}}
      options={[
        { id: 'option1', title: 'option1' },
        { id: 'Option 2', title: 'option2' },
        { id: 'Option 3', title: 'option3' },
      ]}
      onSelect={() => {}}
      placeholder="Select an option"
      badgeText="Issues"
      badgeTone="destructive"
    />
  );
}

export function Example() {
  const [open, setOpen] = React.useState(true);
  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandBadge>Issues</CommandBadge>
      <CommandInput placeholder="Type a command or search..." Icon={User} />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Suggestions">
          <CommandItem>
            <Calendar />
            <span>Calendar</span>
          </CommandItem>
          <CommandItem>
            <Smile />
            <span>Search Emoji</span>
          </CommandItem>
          <CommandItem>
            <Calculator />
            <span>Calculator</span>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Settings">
          <CommandItem>
            <User />
            <span>Profile</span>
            <CommandShortcut>⌘P</CommandShortcut>
          </CommandItem>
          <CommandItem>
            <CreditCard />
            <span>Billing</span>
            <CommandShortcut>⌘B</CommandShortcut>
          </CommandItem>
          <CommandItem>
            <Settings />
            <span>Settings</span>
            <CommandShortcut>⌘S</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
