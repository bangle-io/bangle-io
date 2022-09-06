import { BaseError } from '@bangle.io/base-error';
import type { ActionTestFixtureType } from '@bangle.io/test-utils';
import { OpenedWsPaths } from '@bangle.io/ws-path';

import type { WorkspaceSliceAction } from '../common';
import { createStore, createWsInfo } from './test-utils';

// This shape (Record<actionName, action[]>) exists so the we can exhaustively
// make sure every action's serialization has been tested
const testFixtures: ActionTestFixtureType<WorkspaceSliceAction> = {
  'action::@bangle.io/slice-workspace:set-error': [
    {
      name: 'action::@bangle.io/slice-workspace:set-error' as const,
      value: {
        error: new BaseError({
          message: 'hello-message',
          code: 'MY_CODE',
        }),
      },
    },

    {
      name: 'action::@bangle.io/slice-workspace:set-error' as const,
      value: {
        error: new BaseError({
          message: 'hello-message',
        }),
      },
    },

    {
      name: 'action::@bangle.io/slice-workspace:set-error' as const,
      value: {
        error: new BaseError({
          message: 'hello-message-2',
          code: 'CODE_2',
        }),
      },
    },

    {
      name: 'action::@bangle.io/slice-workspace:set-error' as const,
      value: {
        error: new Error('vanilla-error'),
      },
    },

    {
      name: 'action::@bangle.io/slice-workspace:set-error' as const,
      value: {
        error: Object.assign(new Error('vanilla-error-with-code'), {
          code: 'MY_CODE',
        }),
      },
    },

    {
      name: 'action::@bangle.io/slice-workspace:set-error' as const,
      value: {
        error: undefined,
      },
    },
  ],

  'action::@bangle.io/slice-workspace:refresh-ws-paths': [
    {
      name: 'action::@bangle.io/slice-workspace:refresh-ws-paths' as const,
    },
    {
      name: 'action::@bangle.io/slice-workspace:refresh-ws-paths' as const,
    },
  ],

  'action::@bangle.io/slice-workspace:set-opened-workspace': [
    {
      name: 'action::@bangle.io/slice-workspace:set-opened-workspace' as const,
      value: {
        openedWsPaths: OpenedWsPaths.createFromArray(['test-ws:one.md']),
        wsName: 'test-ws',
      },
    },

    {
      name: 'action::@bangle.io/slice-workspace:set-opened-workspace' as const,
      value: {
        openedWsPaths: OpenedWsPaths.createEmpty(),
        wsName: 'test-ws',
      },
    },

    {
      name: 'action::@bangle.io/slice-workspace:set-opened-workspace' as const,
      value: {
        openedWsPaths: OpenedWsPaths.createEmpty(),
        wsName: undefined,
      },
    },
  ],

  'action::@bangle.io/slice-workspace:update-recently-used-ws-paths': [
    {
      name: 'action::@bangle.io/slice-workspace:update-recently-used-ws-paths' as const,
      value: {
        recentlyUsedWsPaths: [],
        wsName: 'test-ws',
      },
    },

    {
      name: 'action::@bangle.io/slice-workspace:update-recently-used-ws-paths' as const,
      value: {
        recentlyUsedWsPaths: ['test-ws:one.md'],
        wsName: 'test-ws',
      },
    },
  ],

  'action::@bangle.io/slice-workspace:update-ws-paths': [
    {
      name: 'action::@bangle.io/slice-workspace:update-ws-paths' as const,
      value: {
        wsName: 'test-ws',
        wsPaths: ['test-ws:one.md'],
      },
    },

    {
      name: 'action::@bangle.io/slice-workspace:update-ws-paths' as const,
      value: {
        wsName: 'test-ws',
        wsPaths: undefined,
      },
    },
  ],

  'action::@bangle.io/slice-workspace:set-cached-workspace-info': [
    {
      name: 'action::@bangle.io/slice-workspace:set-cached-workspace-info' as const,
      value: {
        workspaceInfo: createWsInfo({ name: 'test-ws' }),
      },
    },
    {
      name: 'action::@bangle.io/slice-workspace:set-cached-workspace-info' as const,
      value: {},
    },
  ],

  'action::@bangle.io/slice-workspace:set-storage-provider-error': [
    {
      name: 'action::@bangle.io/slice-workspace:set-storage-provider-error' as const,
      value: {
        serializedError: JSON.stringify({ t: '123' }),
        uid: '123',
        wsName: 'test-1',
        workspaceType: 'test',
      },
    },
  ],
};

const fixtures = Object.values(testFixtures).flatMap(
  (r: WorkspaceSliceAction[]) => r,
);

let { store } = createStore({});
beforeEach(() => {
  ({ store } = createStore({}));
});
afterEach(() => {});

test.each(fixtures)(`%s actions serialization`, (action) => {
  const res: any = store.parseAction(store.serializeAction(action) as any);

  expect(res).toEqual({ ...action, fromStore: 'workspace-store' });
});

test('Vanilla Error actions serialization with code', () => {
  const error = Object.assign(new Error('vanilla-error-with-code'), {
    code: 'MY_CODE',
  });
  const action = {
    name: 'action::@bangle.io/slice-workspace:set-error' as const,
    value: {
      error,
    },
  };

  expect(error.code).toEqual('MY_CODE');
  const res: any = store.parseAction(store.serializeAction(action) as any);
  expect(res.value.error.code).toEqual(error.code);
});

test('Vanilla Error actions serialization with thrower', () => {
  const error = Object.assign(new Error('vanilla-error-with-code'), {
    thrower: 'I_THREW_IT',
  });
  const action = {
    name: 'action::@bangle.io/slice-workspace:set-error' as const,
    value: {
      error,
    },
  };

  expect(error.code).toBeUndefined();
  expect(error.thrower).toBe('I_THREW_IT');
  const res: any = store.parseAction(store.serializeAction(action) as any);
  expect(res.value.error.code).toEqual(error.code);
  expect(res.value.error.thrower).toEqual(error.thrower);
});

test('Error actions serialization with stack', () => {
  const error = Object.assign(new Error('vanilla-error-with-stack'), {
    stack: `stack`,
  });
  const action = {
    name: 'action::@bangle.io/slice-workspace:set-error' as const,
    value: {
      error,
    },
  };

  const res: any = store.parseAction(store.serializeAction(action) as any);
  expect(res.value.error.stack).toEqual(error.stack);
});

test('Error actions serialization of base error', () => {
  const error = new BaseError({
    message: 'vanilla-error-with-stack',
    code: 'MY_CODE',
    thrower: 'test_thrower',
  });

  const action = {
    name: 'action::@bangle.io/slice-workspace:set-error' as const,
    value: {
      error,
    },
  };

  const res: any = store.parseAction(store.serializeAction(action) as any);
  expect(res.value.error.code).toEqual(error.code);
  expect(res.value.error.thrower).toEqual(error.thrower);
});
