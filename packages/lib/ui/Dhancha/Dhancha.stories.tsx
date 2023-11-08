import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';

import { DhanchaWidescreen } from './index';

const meta: Meta<typeof DhanchaWidescreen> = {
  title: 'ui-dhancha/DhanchaWidescreen',
  component: DhanchaWidescreen,
  argTypes: {},
  decorators: [],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<typeof DhanchaWidescreen>;

export const WithAll: Story = {
  args: {
    leftAside: (
      <div
        style={{
          height: '100%',
          overflowY: 'scroll',
        }}
      >
        <div>Activity bar</div>
        <WorkspaceSidebar />
      </div>
    ),
    mainContent: <MainContent />,
    rightAside: <NoteSidebar />,
    titlebar: <div className="bg-colorBgLayerFloat">I am titlebar</div>,
  },
};

export const OnlyRight: Story = {
  args: {
    mainContent: <MainContent />,
    rightAside: <NoteSidebar />,
    titlebar: <div className="bg-colorBgLayerFloat">I am titlebar</div>,
  },
};

export const OnlyLeft: Story = {
  args: {
    leftAside: (
      <div
        style={{
          height: '100%',
          overflowY: 'scroll',
        }}
      >
        <div>Activity bar</div>
        <WorkspaceSidebar />
      </div>
    ),
    mainContent: <MainContent />,
    titlebar: <div className="bg-colorBgLayerFloat">I am titlebar</div>,
  },
};

export const OnlyMain: Story = {
  args: {
    mainContent: <MainContent />,
    titlebar: <div className="bg-colorBgLayerFloat">I am titlebar</div>,
  },
};

function MainContent() {
  const [noteSidebarOpen, toggleNoteSidebar] = useState(true);
  const [workspaceSidebarOpen, toggleWorkspaceSidebar] = useState(true);

  return (
    <div
      style={{
        backgroundColor: 'pink',
        overflowY: 'scroll',
        height: '100%',
      }}
    >
      <div>
        Main content
        <button
          onClick={() => {
            toggleNoteSidebar((r) => !r);
          }}
        >
          Note Sidebar
        </button>
        <button
          onClick={() => {
            toggleWorkspaceSidebar((r) => !r);
          }}
        >
          Workspace Sidebar
        </button>
        <div>{generateText({ lines: 111 })}</div>
      </div>
    </div>
  );
}

function NoteSidebar() {
  const [noteSidebarOpen, toggleNoteSidebar] = useState(true);

  return noteSidebarOpen ? (
    <div
      style={{
        backgroundColor: 'lightblue',
        height: '100%',
        overflowY: 'scroll',
      }}
    >
      <div>Note sidebar</div>
      <div>{generateText({ lines: 10 })}</div>
    </div>
  ) : null;
}

function WorkspaceSidebar() {
  const [workspaceSidebarOpen, toggleWorkspaceSidebar] = useState(true);

  return workspaceSidebarOpen ? (
    <div
      style={{
        backgroundColor: 'lightgreen',
      }}
      onClick={() => {
        toggleWorkspaceSidebar((r) => !r);
      }}
    >
      <div>{generateText({ lines: 10 })}</div>
    </div>
  ) : null;
}

function generateText({ lines = 10 }) {
  return (
    <div>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} style={{ marginTop: '1rem' }}>
          Tabbed UI Premise: make it clear which file I am working on and
          improve the top level organization of the app. I think it is time to
          just create a master UI skeleton that I can try out independently and
          progressively enhance it for the user. Again prone to the itch of
          creation, I need to think about what skeleton will work best for me.
          MemUI, logSeq and many more in my notes, have decent UI , I just need
          to capture it. Dhancha the main skeleton of the app. headerSection
          mainSection primaryColumn sidebar Notes nThis will be a good exercise
          to break up things in app directory, keep the in mind good article on
          css styling
          https://www.baldurbjarnason.com/2021/100-things-every-web-developer-should-know/
          also do some research on styling.
        </div>
      ))}
    </div>
  );
}
