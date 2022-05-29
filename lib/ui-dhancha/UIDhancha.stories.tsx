import './style.css';

import type { Story } from '@storybook/react';
import React, { useState } from 'react';

import { Dhancha } from './index';

export default {
  title: 'ui-dhancha/Dhancha',
  component: Dhancha,
  argTypes: {},
};

const Template: Story<typeof Dhancha> = (args) => {
  const [noteSidebarOpen, toggleNoteSidebar] = useState(true);
  const [workspaceSidebarOpen, toggleWorkspaceSidebar] = useState(true);

  return (
    <Dhancha
      widescreen={true}
      activitybar={[<span key={1}> H</span>, <span key={2}> B</span>]}
      mainContent={
        <>
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
            </div>
            <div>{generateText({ lines: 1 })}</div>
          </div>
        </>
      }
      noteSidebar={
        noteSidebarOpen && (
          <div
            style={{
              backgroundColor: 'lightblue',
              height: '100vh',
              overflowY: 'scroll',
            }}
          >
            <div>Note sidebar</div>
            <div>{generateText({ lines: 10 })}</div>
          </div>
        )
      }
      workspaceSidebar={
        workspaceSidebarOpen && (
          <div
            style={{
              backgroundColor: 'lightgreen',
              height: '100vh',
              overflowY: 'scroll',
            }}
          ></div>
        )
      }
      {...args}
    />
  );
};

export const Primary = Template.bind({});

Primary.args = {};

const MobileTemplate: Story<typeof Dhancha> = (args) => {
  const [noteSidebarOpen, toggleNoteSidebar] = useState(true);
  const [workspaceSidebarOpen, toggleWorkspaceSidebar] = useState(true);

  return (
    <Dhancha
      widescreen={false}
      activitybar={[<span key={1}> Heading</span>, <span key={2}> Bar</span>]}
      mainContent={
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
      }
      noteSidebar={
        noteSidebarOpen && (
          <div
            style={{
              backgroundColor: 'lightblue',
              height: '100vh',
              overflowY: 'scroll',
            }}
          >
            <div>Note sidebar</div>
            <div>{generateText({ lines: 10 })}</div>
          </div>
        )
      }
      workspaceSidebar={
        workspaceSidebarOpen && (
          <div
            onClick={() => {
              toggleWorkspaceSidebar((r) => !r);
            }}
            style={{
              backgroundColor: 'lightgreen',
              // height: '100vh',
              // overflowY: 'scroll',
            }}
          >
            <div>{generateText({ lines: 10 })}</div>
          </div>
        )
      }
      {...args}
    />
  );
};

export const Mobile = MobileTemplate.bind({});

Mobile.args = {};

function generateText({ lines = 10 }) {
  return (
    <div>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} style={{ marginTop: '1rem' }}>
          Tabbed UI Premise: make it clear which file I am working on and
          improve the top level ogranization of the app. I think it is time to
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
