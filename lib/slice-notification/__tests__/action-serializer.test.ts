import {
  actionSerializerTestFixture,
  ActionTestFixtureType,
  createTestStore,
} from '@bangle.io/test-utils';
import { notificationSlice, notificationSliceKey } from '../notification-slice';

const testFixtures = actionSerializerTestFixture(notificationSliceKey, {
  'action::@bangle.io/slice-notification:DISMISS_NOTIFICATION': [
    {
      name: 'action::@bangle.io/slice-notification:DISMISS_NOTIFICATION',
      value: {
        uid: 'test-1',
      },
    },
  ],
  'action::@bangle.io/slice-notification:SHOW_NOTIFICATION': [
    {
      name: 'action::@bangle.io/slice-notification:SHOW_NOTIFICATION',
      value: {
        content: 'hello',
        uid: 'test-1',
        severity: 'error',
        buttons: [],
      },
    },

    {
      name: 'action::@bangle.io/slice-notification:SHOW_NOTIFICATION',
      value: {
        content: 'hello',
        uid: 'test-1',
        severity: 'info',
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

const { store } = createTestStore({
  sliceKey: notificationSliceKey,
  slices: [notificationSlice()],
});

test.each(testFixtures)(`%s actions serialization`, (action) => {
  const res = store.parseAction(store.serializeAction(action) as any);

  expect(res).toEqual({ ...action, fromStore: 'test-store' });
});
