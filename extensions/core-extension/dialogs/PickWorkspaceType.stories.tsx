import '../style';

import type { Story } from '@storybook/react';
import React, { useCallback } from 'react';

import { Button, OverlayProvider } from '@bangle.io/ui-components';

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
      <Button
        ariaLabel="open"
        text="Open modal"
        onPress={() => {
          setShow(true);
        }}
      />
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
