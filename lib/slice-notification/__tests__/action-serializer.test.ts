import { SEVERITY } from '@bangle.io/constants';
import {
  actionSerializerTestFixture,
  createBareStore,
} from '@bangle.io/test-utils';

import { notificationSlice, notificationSliceKey } from '../notification-slice';

const testFixtures = actionSerializerTestFixture(notificationSliceKey, {
  'action::@bangle.io/slice-notification:SET_EDITOR_ISSUE': [
    {
      name: 'action::@bangle.io/slice-notification:SET_EDITOR_ISSUE',
      value: {
        uid: '123',
        wsPath: 'test:one.md',
        severity: SEVERITY.ERROR,
        title: 'something went wrong',
        serialOperation: 'operation::@bangle.io/slice-notification:whoops',
        description: 'we are sorry',
      },
    },

    {
      name: 'action::@bangle.io/slice-notification:SET_EDITOR_ISSUE',
      value: {
        uid: '123',
        wsPath: 'test:one.md',
        severity: SEVERITY.ERROR,
        title: 'something went wrong',
        serialOperation: undefined,
        description: 'something went wrong',
      },
    },
  ],
  'action::@bangle.io/slice-notification:CLEAR_EDITOR_ISSUE': [
    {
      name: 'action::@bangle.io/slice-notification:CLEAR_EDITOR_ISSUE',
      value: {
        uid: '123',
      },
    },
  ],

  'action::@bangle.io/slice-notification:DISMISS_NOTIFICATION': [
    {
      name: 'action::@bangle.io/slice-notification:DISMISS_NOTIFICATION',
      value: {
        uids: ['test-1'],
      },
    },
  ],
  'action::@bangle.io/slice-notification:CLEAR_ALL_NOTIFICATIONS': [
    {
      name: 'action::@bangle.io/slice-notification:CLEAR_ALL_NOTIFICATIONS',
      value: {},
    },
  ],
  'action::@bangle.io/slice-notification:SHOW_NOTIFICATION': [
    {
      name: 'action::@bangle.io/slice-notification:SHOW_NOTIFICATION',
      value: {
        title: 'hello',
        uid: 'test-1',
        severity: SEVERITY.ERROR,
        buttons: [],
      },
    },
    {
      name: 'action::@bangle.io/slice-notification:SHOW_NOTIFICATION',
      value: {
        title: 'hello 3',
        content: 'i am content',
        uid: 'test-1',
        severity: SEVERITY.ERROR,
        buttons: [],
      },
    },

    {
      name: 'action::@bangle.io/slice-notification:SHOW_NOTIFICATION',
      value: {
        title: 'hello',
        uid: 'test-1',
        severity: SEVERITY.INFO,
        buttons: [
          {
            title: 'I am the title',
            hint: 'I am the hint',
            operation: 'operation::xyz',
          },
          {
            title: 'I am the title2',
            hint: 'I am the hint2',
            operation: 'operation::xyz2',
          },
        ],
      },
    },
  ],
});

test.each(testFixtures)(`%s actions serialization`, (action) => {
  const { store } = createBareStore({
    sliceKey: notificationSliceKey,
    slices: [notificationSlice()],
  });

  const res = store.parseAction(store.serializeAction(action) as any);

  expect(res).toEqual({ ...action, fromStore: 'test-store' });
});
