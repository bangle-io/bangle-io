import { BaseError } from '@bangle.io/base-error';
import { ActionTestFixtureType } from '@bangle.io/test-utils';
import { OpenedWsPaths } from '@bangle.io/ws-path';

import { WorkspaceSliceAction } from '../common';
import { createStore, createWsInfo } from './test-utils';

// This shape (Record<actionName, action[]>) exists so the we can exhaustively
// make sure every action's serialization has been tested
const testFixtures: ActionTestFixtureType<WorkspaceSliceAction> = {
  'action::@bangle.io/slice-workspace:set-error': [
    {
      name: 'action::@bangle.io/slice-workspace:set-error',
      value: {
        error: new BaseError(
          'hello-message',
          'MY_CODE',
          'DISPLAY_MESSAGE',
          null,
        ),
      },
    },

    {
      name: 'action::@bangle.io/slice-workspace:set-error',
      value: {
        error: new BaseError('hello-message'),
      },
    },

    {
      name: 'action::@bangle.io/slice-workspace:set-error',
      value: {
        error: new BaseError('hello-message-2', 'CODE_2'),
      },
    },

    {
      name: 'action::@bangle.io/slice-workspace:set-error',
      value: {
        error: new Error('vanilla-error'),
      },
    },

    {
      name: 'action::@bangle.io/slice-workspace:set-error',
      value: {
        error: undefined,
      },
    },
  ],

  'action::@bangle.io/slice-workspace:set-workspace-infos': [
    {
      name: 'action::@bangle.io/slice-workspace:set-workspace-infos',
      value: {
        workspacesInfo: {},
      },
    },
    {
      name: 'action::@bangle.io/slice-workspace:set-workspace-infos',
      value: {
        workspacesInfo: {
          testWs: createWsInfo({ name: 'testWs' }),
        },
      },
    },
  ],
  'action::@bangle.io/slice-workspace:refresh-ws-paths': [
    {
      name: 'action::@bangle.io/slice-workspace:refresh-ws-paths',
    },
    {
      name: 'action::@bangle.io/slice-workspace:refresh-ws-paths',
    },
  ],

  'action::@bangle.io/slice-workspace:set-opened-workspace': [
    {
      name: 'action::@bangle.io/slice-workspace:set-opened-workspace',
      value: {
        openedWsPaths: OpenedWsPaths.createFromArray(['test-ws:one.md']),
        wsName: 'test-ws',
      },
    },

    {
      name: 'action::@bangle.io/slice-workspace:set-opened-workspace',
      value: {
        openedWsPaths: OpenedWsPaths.createEmpty(),
        wsName: 'test-ws',
      },
    },

    {
      name: 'action::@bangle.io/slice-workspace:set-opened-workspace',
      value: {
        openedWsPaths: OpenedWsPaths.createEmpty(),
        wsName: undefined,
      },
    },
  ],

  'action::@bangle.io/slice-workspace:update-recently-used-ws-paths': [
    {
      name: 'action::@bangle.io/slice-workspace:update-recently-used-ws-paths',
      value: {
        recentlyUsedWsPaths: [],
        wsName: 'test-ws',
      },
    },

    {
      name: 'action::@bangle.io/slice-workspace:update-recently-used-ws-paths',
      value: {
        recentlyUsedWsPaths: ['test-ws:one.md'],
        wsName: 'test-ws',
      },
    },
  ],

  'action::@bangle.io/slice-workspace:update-ws-paths': [
    {
      name: 'action::@bangle.io/slice-workspace:update-ws-paths',
      value: {
        wsName: 'test-ws',
        wsPaths: ['test-ws:one.md'],
      },
    },

    {
      name: 'action::@bangle.io/slice-workspace:update-ws-paths',
      value: {
        wsName: 'test-ws',
        wsPaths: undefined,
      },
    },
  ],
};

const fixtures = Object.values(testFixtures).flatMap(
  (r: WorkspaceSliceAction[]) => r,
);

const { store } = createStore();

test.each(fixtures)(`%s actions serialization`, (action) => {
  const res = store.parseAction(store.serializeAction(action) as any);

  expect(res).toEqual({ ...action, fromStore: 'workspace-store' });
});
