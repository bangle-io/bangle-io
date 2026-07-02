import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { DialogSingleInput } from './dialog-single-input';
import { DialogSingleSelect } from './dialog-single-select';

export default {
  title: 'DialogInputAndSelect',
  component: DialogSingleInput,
  tags: [],
} as Meta<typeof DialogSingleInput>;

type Story = StoryObj<typeof DialogSingleInput>;

export const CreateNoteInput: Story = {
  render: function CreateNoteInputStory() {
    const [open, setOpen] = React.useState(true);
    const [submitted, setSubmitted] = React.useState('');

    return (
      <>
        <DialogSingleInput
          open={open}
          setOpen={setOpen}
          title="Create Note"
          description="Name the note before adding it to this workspace."
          inputLabel="Note name"
          placeholder="Untitled note"
          submitText="Create"
          onSelect={setSubmitted}
        />
        <output aria-label="Submitted note name">{submitted}</output>
      </>
    );
  },
};

export const LongSingleSelect: Story = {
  render: function LongSingleSelectStory() {
    const [open, setOpen] = React.useState(true);
    const options = Array.from({ length: 40 }, (_, index) => ({
      id: `folder-${index + 1}`,
      title: `Folder ${index + 1}`,
    }));

    return (
      <DialogSingleSelect
        open={open}
        setOpen={setOpen}
        badgeText="Move Note"
        placeholder="Find a folder"
        groupHeading="Folders"
        options={options}
        onSelect={() => {}}
      />
    );
  },
};
