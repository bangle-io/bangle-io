// app-alert-dialog.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { AppAlertDialog } from './app-alert-dialog';

const meta: Meta<typeof AppAlertDialog> = {
  title: 'AppAlertDialog',
  component: AppAlertDialog,
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof AppAlertDialog>;

const Template: Story = {
  args: {
    open: true,
    setOpen: () => {},
    title: 'Are you absolutely sure?',
    description:
      'This action cannot be undone. This will permanently delete your account and remove your data from our servers.',
    onCancel: () => console.log('Cancelled'),
    onContinue: () => console.log('Continued'),
    tone: 'default',
  },
};

export const Default: Story = {
  ...Template,
};

export const CustomButtons: Story = {
  ...Template,
  args: {
    ...Template.args,
    cancelText: 'No, go back',
    continueText: 'Yes, delete account',
  },
};

export const SimpleConfirmation: Story = {
  ...Template,
  args: {
    ...Template.args,
    title: 'Save changes?',
    description: 'Do you want to save the changes you made?',
    continueText: 'Save',
  },
};

export const Destructive: Story = {
  ...Template,
  args: {
    ...Template.args,
    title: 'Delete Project',
    description:
      'Are you sure you want to delete this project? This action cannot be undone.',
    continueText: 'Delete',
    tone: 'destructive',
  },
};

export const DefaultTone: Story = {
  ...Template,
  args: {
    ...Template.args,
    title: 'Confirm Action',
    description: 'Are you sure you want to proceed with this action?',
    continueText: 'Proceed',
    tone: 'default',
  },
};

export const DestructiveTone: Story = {
  ...Template,
  args: {
    ...Template.args,
    title: 'Delete Project',
    description:
      'Are you sure you want to delete this project? This action cannot be undone.',
    continueText: 'Delete',
    tone: 'destructive',
  },
};
