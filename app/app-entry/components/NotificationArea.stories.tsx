import type { Story } from '@storybook/react';
import React from 'react';

import { Severity } from '@bangle.io/constants';
import { showNotification } from '@bangle.io/slice-notification';
import { StorybookStore } from '@bangle.io/test-utils';
import { ButtonV2 } from '@bangle.io/ui-components';

import { NotificationArea } from './NotificationArea';

export default {
  title: 'app-entry/NotificationArea',
  component: NotificationArea,
  argTypes: {},
};

export const Main: Story<Parameters<typeof NotificationArea>[0]> = (args) => {
  return (
    <div style={{ width: 400 }}>
      <StorybookStore
        onMount={(store) => {
          showNotification({
            severity: Severity.WARNING,
            title: 'Test notification',
            content: 'This is the first',
            uid: 'test-uid-first',
            createdAt: 1,
          })(store.state, store.dispatch);
        }}
        renderChildren={(store) => (
          <>
            <ButtonV2
              text="Show notification"
              onPress={() => {
                showNotification({
                  severity: Severity.WARNING,
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
