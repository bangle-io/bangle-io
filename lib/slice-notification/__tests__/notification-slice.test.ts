import { AppState } from '@bangle.io/create-store';

import { notificationSlice, notificationSliceKey } from '..';

test('blank state', () => {
  let state = AppState.create({ slices: [notificationSlice()] });

  expect(notificationSliceKey.getSliceState(state)).toMatchInlineSnapshot(`
    Object {
      "notifications": Array [],
    }
  `);
});

test('updating and removing notifications', () => {
  let state = AppState.create({ slices: [notificationSlice()] });

  let action = {
    name: 'action::@bangle.io/slice-notification:SHOW_NOTIFICATION' as const,
    value: {
      uid: 'test-1',
      title: 'hello',
      severity: 'error' as const,
      content: 'hello world',
      buttons: [],
    },
  };

  state = state.applyAction(action);

  expect(notificationSliceKey.getSliceState(state)).toMatchInlineSnapshot(`
    Object {
      "notifications": Array [
        Object {
          "buttons": Array [],
          "content": "hello world",
          "severity": "error",
          "title": "hello",
          "uid": "test-1",
        },
      ],
    }
  `);
  // prevents adding the same uid again
  action = {
    name: 'action::@bangle.io/slice-notification:SHOW_NOTIFICATION' as const,
    value: {
      uid: 'test-1',
      title: 'hello I am a duplicate',
      severity: 'error' as const,
      buttons: [],
      content: 'hello world again',
    },
  };

  let newstate1 = state.applyAction(action);

  expect(notificationSliceKey.getSliceState(newstate1)).toBe(
    notificationSliceKey.getSliceState(state),
  );

  // adds more actionsj
  action = {
    name: 'action::@bangle.io/slice-notification:SHOW_NOTIFICATION' as const,
    value: {
      uid: 'test-2',
      title: 'hello2',
      severity: 'error' as const,
      content: 'hello world 2',
      buttons: [],
    },
  };

  let newstate2 = state.applyAction(action);

  expect(notificationSliceKey.getSliceState(newstate2)).toEqual({
    notifications: [
      {
        buttons: [],
        title: 'hello',
        content: 'hello world',
        severity: 'error',
        uid: 'test-1',
      },
      {
        buttons: [],
        title: 'hello2',
        content: 'hello world 2',
        severity: 'error',
        uid: 'test-2',
      },
    ],
  });

  let action2 = {
    name: 'action::@bangle.io/slice-notification:DISMISS_NOTIFICATION' as const,
    value: {
      uids: ['test-1'],
    },
  };

  let newstate3 = newstate2.applyAction(action2);

  expect(notificationSliceKey.getSliceState(newstate3)).toEqual({
    notifications: [
      {
        buttons: [],
        title: 'hello2',
        content: 'hello world 2',
        severity: 'error',
        uid: 'test-2',
      },
    ],
  });
});

test('removing not found notification preserves state instance', () => {
  let state = AppState.create({ slices: [notificationSlice()] });

  let action = {
    name: 'action::@bangle.io/slice-notification:SHOW_NOTIFICATION' as const,
    value: {
      uid: 'test-1',
      title: 'hello',
      severity: 'error' as const,
      buttons: [],
    },
  };

  state = state.applyAction(action);

  let newState = state.applyAction({
    name: 'action::@bangle.io/slice-notification:DISMISS_NOTIFICATION',
    value: {
      uids: ['not-found'],
    },
  });

  expect(notificationSliceKey.getSliceState(newState)).toBe(
    notificationSliceKey.getSliceState(state),
  );
});
