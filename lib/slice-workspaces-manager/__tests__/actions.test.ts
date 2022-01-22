import { BaseAction } from '@bangle.io/create-store';
import { clearFakeIdb } from '@bangle.io/test-utils/fake-idb';

import { WorkspacesSliceAction } from '../common';
import { createStore, createWsInfo } from './test-utils';

export type ActionTestFixtureType<A extends BaseAction> = {
  [K in A['name']]: Array<A extends { name: K } ? A : never>;
};

// This shape (Record<actionName, action[]>) exists so the we can exhaustively
// make sure every action's serialization has been tested
const testFixtures: ActionTestFixtureType<WorkspacesSliceAction> = {
  'action::@bangle.io/slice-workspaces-manager:set-workspace-infos': [
    {
      name: 'action::@bangle.io/slice-workspaces-manager:set-workspace-infos',
      value: {
        workspaceInfos: {},
      },
    },
    {
      name: 'action::@bangle.io/slice-workspaces-manager:set-workspace-infos',
      value: {
        workspaceInfos: {
          testWs: createWsInfo({ name: 'testWs' }),
        },
      },
    },
  ],
};

const fixtures = Object.values(testFixtures).flatMap(
  (r: WorkspacesSliceAction[]) => r,
);

const { store } = createStore();

test.each(fixtures)(`%# actions serialization`, (action) => {
  const res = store.parseAction(store.serializeAction(action) as any);

  expect(res).toEqual({ ...action, fromStore: 'workspaces-store' });
});
