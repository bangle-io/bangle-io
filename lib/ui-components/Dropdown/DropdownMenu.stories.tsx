import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import { DropdownMenu, MenuItem, MenuSection } from './DropdownMenu';

const meta: Meta<typeof DropdownMenu> = {
  title: 'ui-components/DropdownMenu',
  component: DropdownMenu,
  argTypes: {},
  decorators: [],
};

export default meta;

type Story = StoryObj<typeof DropdownMenu>;

export const Primary: Story = {
  args: {
    buttonProps: { text: 'Click Me' },
    children: (
      <MenuSection aria-label="misc section">
        <MenuItem aria-label="new note" key={'NewNoteKey'}>
          New note
        </MenuItem>
        <MenuItem aria-label="new workspace" key={'NewWorkspaceKey'}>
          New workspace
        </MenuItem>
      </MenuSection>
    ),
  },
};
