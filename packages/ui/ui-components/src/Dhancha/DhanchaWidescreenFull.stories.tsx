import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';

import { DhanchaWidescreen } from './index';

const meta: Meta<typeof DhanchaWidescreen> = {
  title: 'DhanchaWidescreenFull',
  component: DhanchaWidescreen,
  argTypes: {},
  decorators: [],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<typeof DhanchaWidescreen>;

export const Propper: Story = {
  render: () => {
    return <App />;
  },
};

function App() {
  const [_showLeft, _updateShowLeft] = useState();
  const [_showRight, _updateShowRight] = useState();

  return (
    <DhanchaWidescreen
      mainContent={<MainContent />}
      leftAside={<LeftSidebar />}
      rightAside={<NoteSidebar />}
      titlebar={
        <div className="h-full border-colorBorderSubdued border-b border-b-1 bg-colorBgLayerFloat">
          I am titlebar
        </div>
      }
    />
  );
}

function MainContent() {
  return (
    <div className="bg-colorBgLayer">
      <div className="bg-colorBgLayerFloat">I am main content</div>
    </div>
  );
}

function LeftSidebar() {
  return (
    <div
      className="bg-colorBgLayerFloat"
      style={{
        height: '100%',
        overflowY: 'scroll',
      }}
    >
      <div>Left bar</div>
    </div>
  );
}

function NoteSidebar() {
  return (
    <div
      style={{
        height: '100%',
        overflowY: 'scroll',
      }}
    >
      <div>Note sidebar</div>
    </div>
  );
}
