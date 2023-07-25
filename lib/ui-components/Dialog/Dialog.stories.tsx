import '../style';

import { OverlayProvider } from '@react-aria/overlays';
import type { Meta, StoryObj } from '@storybook/react';
import React, { useCallback, useState } from 'react';

import { Button } from '../Button';
import { Dialog } from './Dialog';

function DialogWrapper(props: Parameters<typeof Dialog>[0]) {
  const [show, setShow] = React.useState(false);

  const onDismiss = useCallback(() => setShow(false), []);

  return (
    <div>
      <Button
        ariaLabel="open"
        onPress={() => {
          setShow(true);
        }}
        text="Open modal"
      />
      <OverlayProvider>
        {show && <Dialog {...props} onDismiss={onDismiss} />}
      </OverlayProvider>
    </div>
  );
}

const meta: Meta<typeof DialogWrapper> = {
  title: 'ui-components/Dialog',
  component: DialogWrapper,

  decorators: [],
};

export default meta;

type Story = StoryObj<typeof DialogWrapper>;

export const SimpleSubmit: Story = {
  args: {
    children: `Lorem ipsum dolor sit amet, consectetur adipiscing elit.
  Lorem ipsum`,
    isDismissable: true,
    headingTitle: 'This is a heading',
    primaryButtonConfig: {
      onPress: () => {},
      text: 'Submit',
    },
    heroImageUrl: 'https://i.imgur.com/Z7AzH2c.png',
  },
};

export const Destructive: Story = {
  args: {
    children: `You want to delete this?`,
    isDismissable: true,
    headingTitle: 'Oh no',
    primaryButtonConfig: {
      onPress: () => {},
      isDestructive: true,
      text: 'Delete',
    },
  },
};

export const LoadingDialog: Story = {
  args: {
    children: `I am loading...`,
    isDismissable: true,
    isLoading: true,
    headingTitle: 'Oh no',
    primaryButtonConfig: {
      onPress: () => {},
      isDestructive: true,
      text: 'Delete',
    },
  },
};

function ScrollableParentWrapper() {
  const [show, setShow] = React.useState(false);

  const onDismiss = useCallback(() => setShow(false), []);

  return (
    <div style={{ maxWidth: 300 }}>
      <div>
        Lorem ipsum, dolor sit amet consectetur adipisicing elit. Sint, corporis
        libero? Consequuntur veniam perferendis soluta odit rem esse earum
        repellat officiis cum recusandae, quas facilis eos ad rerum quibusdam
        eligendi.
      </div>
      <div>
        Lorem ipsum, dolor sit amet consectetur adipisicing elit. Sint, corporis
        libero? Consequuntur veniam perferendis soluta odit rem esse earum
        repellat officiis cum recusandae, quas facilis eos ad rerum quibusdam
        eligendi.
      </div>
      <div>
        Lorem ipsum, dolor sit amet consectetur adipisicing elit. Sint, corporis
        libero? Consequuntur veniam perferendis soluta odit rem esse earum
        repellat officiis cum recusandae, quas facilis eos ad rerum quibusdam
        eligendi.
      </div>
      <div>
        Lorem ipsum, dolor sit amet consectetur adipisicing elit. Sint, corporis
        libero? Consequuntur veniam perferendis soluta odit rem esse earum
        repellat officiis cum recusandae, quas facilis eos ad rerum quibusdam
        eligendi.
      </div>
      <Button
        ariaLabel="open"
        onPress={() => {
          setShow(true);
        }}
        text="Open modal"
      />
      <div>
        Lorem ipsum, dolor sit amet consectetur adipisicing elit. Sint, corporis
        libero? Consequuntur veniam perferendis soluta odit rem esse earum
        repellat officiis cum recusandae, quas facilis eos ad rerum quibusdam
        eligendi.
      </div>
      <div>
        Lorem ipsum, dolor sit amet consectetur adipisicing elit. Sint, corporis
        libero? Consequuntur veniam perferendis soluta odit rem esse earum
        repellat officiis cum recusandae, quas facilis eos ad rerum quibusdam
        eligendi.
      </div>
      <div>
        Lorem ipsum, dolor sit amet consectetur adipisicing elit. Sint, corporis
        libero? Consequuntur veniam perferendis soluta odit rem esse earum
        repellat officiis cum recusandae, quas facilis eos ad rerum quibusdam
        eligendi.
      </div>
      <OverlayProvider className="z-modal">
        {show && (
          <Dialog onDismiss={onDismiss} isDismissable={true} headingTitle="Wow">
            I am the modal content
          </Dialog>
        )}
      </OverlayProvider>
    </div>
  );
}

export const ScrollableParent: Story = {
  render: () => <ScrollableParentWrapper />,
};
