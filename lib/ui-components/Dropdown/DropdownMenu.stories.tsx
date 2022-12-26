import './style';

import type { Story } from '@storybook/react';
import React from 'react';

import type { FirstParameter } from '@bangle.io/shared-types';

import { ButtonContent } from './ButtonContent';
import { DropdownMenu, MenuItem, MenuSection } from './DropdownMenu';

export default {
  title: 'ui-bangle-button/DropdownMenu',
  component: DropdownMenu,

  argTypes: {
    backgroundColor: { control: 'color' },
  },
};

export const Primary: Story<FirstParameter<typeof DropdownMenu>> = (args) => {
  return <DropdownMenu {...args}></DropdownMenu>;
};

Primary.args = {
  buttonChildren: <ButtonContent text="wow" size="small" />,
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
