import type { Story } from '@storybook/react';
import React from 'react';

import { getNewStore } from '@bangle.io/api';
import { SEVERITY } from '@bangle.io/constants';
import { nsmNotification } from '@bangle.io/slice-notification';
import { StorybookStore } from '@bangle.io/test-utils';
import { Button } from '@bangle.io/ui-components';

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
          const newStore = getNewStore(store);

          newStore.dispatch(
            nsmNotification.showNotification({
              buttons: [],
              severity: SEVERITY.WARNING,
              title: 'Test notification',
              content: 'This is the first',
              uid: 'test-uid-warning',
              createdAt: 1,
            }),
          );
          newStore.dispatch(
            nsmNotification.showNotification({
              buttons: [],
              severity: SEVERITY.SUCCESS,
              title: 'Test notification',
              content: 'This is the second',
              uid: 'test-uid-success',
              createdAt: 1,
            }),
          );

          newStore.dispatch(
            nsmNotification.showNotification({
              buttons: [],
              severity: SEVERITY.INFO,
              title: 'Test notification',
              content: 'This is the third',
              uid: 'test-uid-info',
              createdAt: 1,
            }),
          );

          newStore.dispatch(
            nsmNotification.showNotification({
              buttons: [],
              severity: SEVERITY.ERROR,
              title: 'Test notification',
              content: 'This is the fourd',
              uid: 'test-uid-error',
              createdAt: 1,
            }),
          );
        }}
        renderChildren={(store) => {
          const newStore = getNewStore(store);

          return (
            <>
              <Button
                text="Show warning"
                className="ml-2"
                onPress={() => {
                  newStore.dispatch(
                    nsmNotification.showNotification({
                      buttons: [],
                      severity: SEVERITY.WARNING,
                      title: 'Test notification',
                      content: 'This is a notification',
                      uid: 'test-uid' + Date.now(),
                      createdAt: Date.now(),
                    }),
                  );
                }}
              />
              <Button
                text="Show error"
                className="ml-2"
                onPress={() => {
                  newStore.dispatch(
                    nsmNotification.showNotification({
                      buttons: [],
                      severity: SEVERITY.ERROR,
                      title: 'Test notification',
                      content: 'This is a notification',
                      uid: 'test-uid' + Date.now(),
                      createdAt: Date.now(),
                    }),
                  );
                }}
              />

              <Button
                text="Show success"
                className="ml-2"
                onPress={() => {
                  newStore.dispatch(
                    nsmNotification.showNotification({
                      buttons: [],
                      severity: SEVERITY.SUCCESS,
                      title: 'Test notification',
                      content: 'This is a notification',
                      uid: 'test-uid' + Date.now(),
                      createdAt: Date.now(),
                    }),
                  );
                }}
              />
              <NotificationArea></NotificationArea>
            </>
          );
        }}
      />
    </div>
  );
};
