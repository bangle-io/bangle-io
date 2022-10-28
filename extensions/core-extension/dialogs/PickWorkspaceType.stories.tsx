import '../style';

import type { Story } from '@storybook/react';
import React, { useCallback } from 'react';

import { ActionButton, ButtonContent } from '@bangle.io/ui-bangle-button';
import { OverlayProvider } from '@bangle.io/ui-components';

import { PickWorkspaceType } from './PickWorkspaceType';

export default {
  title: 'core-extension/PickWorkspaceType',
  component: PickWorkspaceType,
  argTypes: {},
};

export const Template: Story<Parameters<typeof PickWorkspaceType>[0]> = (
  args,
) => {
  const [show, setShow] = React.useState(false);

  args.onDismiss = useCallback(() => setShow(false), []);

  return (
    <div>
      <ActionButton
        ariaLabel="open"
        onPress={() => {
          setShow(true);
        }}
      >
        <ButtonContent text="Open modal" />
      </ActionButton>
      <OverlayProvider>
        {show && <PickWorkspaceType {...args} />}
      </OverlayProvider>
    </div>
  );
};

export const SimpleSubmit = Template.bind({});

SimpleSubmit.args = {
  onSelect: () => {},
  hasGithub: true,
};
