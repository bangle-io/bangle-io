import React from 'react';

import { SEVERITY } from '@bangle.io/constants';
import {
  nsmNotification,
  nsmNotificationSlice,
} from '@bangle.io/slice-notification';
import type { Meta, StoryObj } from '@bangle.io/test-utils-2';
import {
  getStoreFromStorybookContext,
  setupTestStore,
  storybookStoreDecorator,
} from '@bangle.io/test-utils-2';
import { Button } from '@bangle.io/ui-components';

import { NotificationArea } from './NotificationArea';

const meta: Meta<typeof NotificationArea> = {
  title: 'app-entry/NotificationArea',
  component: NotificationArea,
  argTypes: {},
};
type Story = StoryObj<typeof NotificationArea>;

export default meta;

export const Main: Story = {
  decorators: [
    (Story, ctx) => {
      // we setup this store temporarily so we can prefill the main
      // store with some notifications
      const dummyStore = setupTestStore({
        abortSignal: new AbortController().signal,
        slices: [nsmNotificationSlice],
      });

      dummyStore.testStore.dispatch(
        nsmNotification
          .showNotification({
            severity: SEVERITY.WARNING,
            title: 'Test notification',
            content: 'This is a notification',
            uid: 'test-uid' + performance.now(),
            createdAt: Date.now(),
          })
          .append(
            nsmNotification.showNotification({
              severity: SEVERITY.SUCCESS,
              title: 'Test notification',
              content: 'This is a notification',
              uid: 'test-uid' + performance.now(),
              createdAt: Date.now(),
            }),
          ),
      );

      return storybookStoreDecorator({
        core: {
          page: true,
          workspace: true,
          stateOverride(base) {
            const notificationState = nsmNotificationSlice.get(
              dummyStore.testStore.state,
            );

            return {
              ...base,
              [nsmNotificationSlice.sliceId]: notificationState,
            };
          },
        },
        slices: [nsmNotificationSlice],
      })(Story, ctx);
    },
  ],
  render: (args, context) => {
    const store = getStoreFromStorybookContext(context);

    return (
      <>
        <Button
          text="Show warning"
          className="ml-2"
          onPress={() => {
            store.dispatch(
              nsmNotification.showNotification({
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
            store.dispatch(
              nsmNotification.showNotification({
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
            store.dispatch(
              nsmNotification.showNotification({
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
  },
};
