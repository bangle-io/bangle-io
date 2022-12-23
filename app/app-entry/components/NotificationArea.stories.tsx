import type { Story } from '@storybook/react';
import React from 'react';

import { SEVERITY } from '@bangle.io/constants';
import { showNotification } from '@bangle.io/slice-notification';
import { StorybookStore } from '@bangle.io/test-utils';
import { ButtonV2 } from '@bangle.io/ui-components';

import { NotificationArea } from './NotificationArea';

export default {
  title: 'app-entry/NotificationArea',
  component: NotificationArea,
  argTypes: {},
};

export const Main: Story = (args) => {
  return (
    <div style={{ width: 400 }}>
      <StorybookStore
        onMount={(store) => {
          showNotification({
            severity: SEVERITY.WARNING,
            title: 'Test notification',
            content: 'This is the first',
            uid: 'test-uid-first',
            createdAt: 1,
          })(store.state, store.dispatch);
        }}
        renderChildren={(store) => (
          <>
            <ButtonV2
              text="Show warning"
              className="ml-2"
              onPress={() => {
                showNotification({
                  severity: SEVERITY.WARNING,
                  title: 'Test notification',
                  content: 'This is a notification',
                  uid: 'test-uid' + Date.now(),
                  createdAt: Date.now(),
                })(store.state, store.dispatch);
              }}
            />
            <ButtonV2
              text="Show error"
              className="ml-2"
              onPress={() => {
                showNotification({
                  severity: SEVERITY.ERROR,
                  title: 'Test notification',
                  content: 'This is a notification',
                  uid: 'test-uid' + Date.now(),
                  createdAt: Date.now(),
                })(store.state, store.dispatch);
              }}
            />
            <NotificationArea></NotificationArea>
          </>
        )}
      />
    </div>
  );
};
