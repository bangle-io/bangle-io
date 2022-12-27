import { SEVERITY } from '@bangle.io/constants';
import { AppState } from '@bangle.io/create-store';

import { notificationSlice, notificationSliceKey } from '..';

test('blank state', () => {
  let state = AppState.create({ slices: [notificationSlice()] });

  expect(notificationSliceKey.getSliceState(state)).toMatchInlineSnapshot(`
    {
      "editorIssues": [],
      "notifications": [],
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
      severity: SEVERITY.ERROR,
      content: 'hello world',
      buttons: [],
    },
  };

  state = state.applyAction(action);

  expect(notificationSliceKey.getSliceState(state)).toMatchInlineSnapshot(`
    {
      "editorIssues": [],
      "notifications": [
        {
          "buttons": [],
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
      severity: SEVERITY.ERROR,
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
      severity: SEVERITY.ERROR,
      content: 'hello world 2',
      buttons: [],
    },
  };

  let newstate2 = state.applyAction(action);

  expect(notificationSliceKey.getSliceState(newstate2)).toEqual({
    editorIssues: [],
    notifications: [
      {
        buttons: [],
        title: 'hello',
        content: 'hello world',
        severity: SEVERITY.ERROR,
        uid: 'test-1',
      },
      {
        buttons: [],
        title: 'hello2',
        content: 'hello world 2',
        severity: SEVERITY.ERROR,
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
    editorIssues: [],
    notifications: [
      {
        buttons: [],
        title: 'hello2',
        content: 'hello world 2',
        severity: SEVERITY.ERROR,
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
      severity: SEVERITY.ERROR,
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

describe('editor issues', () => {
  test('adding and removing editor issues', () => {
    let state = AppState.create({ slices: [notificationSlice()] });

    state = state.applyAction({
      name: 'action::@bangle.io/slice-notification:SET_EDITOR_ISSUE',
      value: {
        uid: 'test-1',
        title: 'hello',
        severity: SEVERITY.ERROR,
        description: 'hello world',
        serialOperation: 'operation::test',
        wsPath: 'test:one.md',
      },
    });

    expect(notificationSliceKey.getSliceState(state)?.editorIssues).toEqual([
      {
        description: 'hello world',
        serialOperation: 'operation::test',
        severity: SEVERITY.ERROR,
        title: 'hello',
        uid: 'test-1',
        wsPath: 'test:one.md',
      },
    ]);

    state = state.applyAction({
      name: 'action::@bangle.io/slice-notification:CLEAR_EDITOR_ISSUE',
      value: {
        uid: 'test-1',
      },
    });

    expect(notificationSliceKey.getSliceState(state)?.editorIssues).toEqual([]);
  });

  test('overwrites based on wsPath', () => {
    let originalConsoleWarn = console.warn;
    console.warn = jest.fn();

    let state = AppState.create({ slices: [notificationSlice()] });

    state = state.applyAction({
      name: 'action::@bangle.io/slice-notification:SET_EDITOR_ISSUE',
      value: {
        uid: 'test-1',
        title: 'hello',
        severity: SEVERITY.ERROR,
        description: 'hello world',
        serialOperation: 'operation::test',
        wsPath: 'test:one.md',
      },
    });

    state = state.applyAction({
      name: 'action::@bangle.io/slice-notification:SET_EDITOR_ISSUE',
      value: {
        uid: 'test-2',
        title: 'hello',
        severity: SEVERITY.ERROR,
        description: 'hello world',
        serialOperation: 'operation::test',
        wsPath: 'test:two.md',
      },
    });

    expect(
      notificationSliceKey.getSliceState(state)?.editorIssues,
    ).toHaveLength(2);

    state = state.applyAction({
      name: 'action::@bangle.io/slice-notification:SET_EDITOR_ISSUE',
      value: {
        uid: 'test-3',
        title: 'hello',
        severity: SEVERITY.ERROR,
        description: 'bye world',
        serialOperation: 'operation::test',
        wsPath: 'test:two.md',
      },
    });

    expect(notificationSliceKey.getSliceState(state)?.editorIssues).toEqual([
      {
        description: 'hello world',
        serialOperation: 'operation::test',
        severity: SEVERITY.ERROR,
        title: 'hello',
        uid: 'test-1',
        wsPath: 'test:one.md',
      },
      {
        uid: 'test-3',
        title: 'hello',
        severity: SEVERITY.ERROR,
        description: 'bye world',
        serialOperation: 'operation::test',
        wsPath: 'test:two.md',
      },
    ]);

    console.warn = originalConsoleWarn;
  });
});
