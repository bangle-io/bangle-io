import '../style';

import type { Meta, StoryObj } from '@storybook/react';
import React, { useCallback } from 'react';

import { Button, OverlayProvider } from '@bangle.io/ui-components';

import { PickWorkspaceType } from './PickWorkspaceType';

function PickWorkspaceTypeStory(
  props: Parameters<typeof PickWorkspaceType>[0],
) {
  const [show, setShow] = React.useState(false);

  const onDismiss = useCallback(() => setShow(false), []);

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
        {show && <PickWorkspaceType {...props} onDismiss={onDismiss} />}
      </OverlayProvider>
    </div>
  );
}

const meta: Meta<typeof PickWorkspaceTypeStory> = {
  title: 'core-extension/PickWorkspaceType',
  component: PickWorkspaceTypeStory,
  argTypes: {},
  decorators: [],
};

type Story = StoryObj<typeof PickWorkspaceType>;

export default meta;

export const SimpleSubmit: Story = {
  args: { onSelect: () => {}, hasGithub: true },
};
