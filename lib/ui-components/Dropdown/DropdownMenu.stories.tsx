import type { Story } from '@storybook/react';
import React from 'react';

import type { FirstParameter } from '@bangle.io/shared-types';

import { DropdownMenu, MenuItem, MenuSection } from './DropdownMenu';

export default {
  title: 'ui-components/DropdownMenu',
  component: DropdownMenu,

  argTypes: {},
};

export const Primary: Story<FirstParameter<typeof DropdownMenu>> = (args) => {
  return <DropdownMenu {...args}></DropdownMenu>;
};

Primary.args = {
  buttonProps: { text: 'wow' },
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
};
