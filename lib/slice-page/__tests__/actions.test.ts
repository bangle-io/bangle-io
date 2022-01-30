import { BaseAction } from '@bangle.io/create-store';
import type { ActionTestFixtureType } from '@bangle.io/test-utils';

import { PageSliceAction } from '../common';
import { createStore } from './test-utils';

// This shape (Record<actionName, action[]>) exists so the we can exhaustively
// make sure every action's serialization has been tested
const testFixtures: ActionTestFixtureType<PageSliceAction> = {
  'action::@bangle.io/slice-page:BLOCK_RELOAD': [
    {
      name: 'action::@bangle.io/slice-page:BLOCK_RELOAD',
      value: {
        block: true,
      },
    },
  ],
  'action::@bangle.io/slice-page:UPDATE_PAGE_LIFE_CYCLE_STATE': [
    {
      name: 'action::@bangle.io/slice-page:UPDATE_PAGE_LIFE_CYCLE_STATE',
      value: {
        current: 'active',
        previous: undefined,
      },
    },
    {
      name: 'action::@bangle.io/slice-page:UPDATE_PAGE_LIFE_CYCLE_STATE',
      value: {
        current: 'active',
        previous: 'frozen',
      },
    },
  ],
  'action::@bangle.io/slice-page:history-update-location': [
    {
      name: 'action::@bangle.io/slice-page:history-update-location',
      value: { location: { pathname: '/ws/test', search: undefined } },
    },
    {
      name: 'action::@bangle.io/slice-page:history-update-location',
      value: { location: { pathname: '/ws/test', search: 'something' } },
    },
  ],
  'action::@bangle.io/slice-page:history-update-pending-navigation': [
    {
      name: 'action::@bangle.io/slice-page:history-update-pending-navigation',
      value: {
        pendingNavigation: {
          location: { pathname: '/ws/test', search: undefined },
        },
      },
    },
    {
      name: 'action::@bangle.io/slice-page:history-update-pending-navigation',
      value: {
        pendingNavigation: {
          location: { pathname: '/ws/test', search: undefined },
          preserve: true,
          replaceHistory: true,
        },
      },
    },
    {
      name: 'action::@bangle.io/slice-page:history-update-pending-navigation',
      value: {
        pendingNavigation: undefined,
      },
    },
  ],
};

const fixtures = Object.values(testFixtures).flatMap(
  (r: PageSliceAction[]) => r,
);

const { store } = createStore();

test.each(fixtures)(`%# workspace actions serialization`, (action) => {
  const res = store.parseAction(store.serializeAction(action) as any);

  expect(res).toEqual({ ...action, fromStore: 'test-store' });
});
