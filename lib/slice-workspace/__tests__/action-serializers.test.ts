import { BaseAction } from '@bangle.io/create-store';
import { OpenedWsPaths } from '@bangle.io/ws-path';

import { WorkspaceSliceAction } from '../common';
import { createStore, createWsInfo } from './test-utils';

export type ActionTestFixtureType<A extends BaseAction> = {
  [K in A['name']]: Array<A extends { name: K } ? A : never>;
};

// This shape (Record<actionName, action[]>) exists so the we can exhaustively
// make sure every action's serialization has been tested
const testFixtures: ActionTestFixtureType<WorkspaceSliceAction> = {
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
  'action::@bangle.io/slice-workspace:set-pending-refresh-ws-paths': [
    {
      name: 'action::@bangle.io/slice-workspace:set-pending-refresh-ws-paths',
      value: {
        pendingRefreshWsPaths: 'test-ws',
      },
    },
    {
      name: 'action::@bangle.io/slice-workspace:set-pending-refresh-ws-paths',
      value: {
        pendingRefreshWsPaths: undefined,
      },
    },
  ],

  'action::@bangle.io/slice-workspace:sync-page-location': [
    {
      name: 'action::@bangle.io/slice-workspace:sync-page-location',
      value: {
        openedWsPaths: OpenedWsPaths.createFromArray(['test-ws:one.md']),
        wsName: 'test-ws',
      },
    },

    {
      name: 'action::@bangle.io/slice-workspace:sync-page-location',
      value: {
        openedWsPaths: OpenedWsPaths.createEmpty(),
        wsName: 'test-ws',
      },
    },

    {
      name: 'action::@bangle.io/slice-workspace:sync-page-location',
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

test.each(fixtures)(`%# actions serialization`, (action) => {
  const res = store.parseAction(store.serializeAction(action) as any);

  expect(res).toEqual({ ...action, fromStore: 'workspace-store' });
});
