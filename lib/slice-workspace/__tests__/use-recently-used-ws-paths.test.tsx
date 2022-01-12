import { act, renderHook } from '@testing-library/react-hooks';

import {
  initialBangleStore,
  useSliceState,
} from '@bangle.io/app-state-context';
import { getPageLocation } from '@bangle.io/slice-page';
import {
  getWorkspaceInfo,
  WorkspaceType,
} from '@bangle.io/slice-workspaces-manager';
import { RecencyRecords, sleep, useRecencyMonitor } from '@bangle.io/utils';
import { wsPathToPathname, wsPathToSearch } from '@bangle.io/ws-path';

import { workspaceSliceKey } from '../common';
import { useRecentlyUsedWsPaths } from '../use-recently-used-ws-paths';
import { workspaceSliceInitialState } from '../workspace-slice';
import { createStore } from './test-utils';

jest.mock('@bangle.io/slice-page', () => {
  const ops = jest.requireActual('@bangle.io/slice-page');
  return {
    ...ops,
    getPageLocation: jest.fn(),
  };
});

jest.mock('@bangle.io/utils', () => {
  const actual = jest.requireActual('@bangle.io/utils');
  return {
    ...actual,
    useRecencyMonitor: jest.fn(),
  };
});

jest.mock('@bangle.io/app-state-context', () => {
  const actual = jest.requireActual('@bangle.io/app-state-context');
  return {
    ...actual,
    useSliceState: jest.fn(),
  };
});
jest.mock('@bangle.io/slice-workspaces-manager', () => {
  const ops = jest.requireActual('@bangle.io/slice-workspaces-manager');

  return {
    ...ops,
    getWorkspaceInfo: jest.fn(() => {}),
  };
});
const getPageLocationMock = getPageLocation as jest.MockedFunction<
  typeof getPageLocation
>;

const getWorkspaceInfoMock = getWorkspaceInfo as jest.MockedFunction<
  typeof getWorkspaceInfo
>;

beforeEach(() => {
  getWorkspaceInfoMock.mockImplementation(() => async () => ({
    name: 'test-ws',
    type: WorkspaceType.browser,
    metadata: {},
    lastModified: 1,
  }));
  (useSliceState as any).mockImplementation(() => ({
    sliceState: workspaceSliceInitialState,
    store: initialBangleStore,
  }));
});

test('returns wsPaths correctly', async () => {
  let records: RecencyRecords = [{ key: 'test-ws:note1.md', timestamps: [1] }],
    updateRecord = jest.fn();
  (useRecencyMonitor as any).mockImplementation(() => {
    return { records, updateRecord };
  });

  const { store, dispatchSpy } = createStore({
    wsName: 'test-ws',
    openedWsPaths: ['test-ws:note1.md'],
    wsPaths: ['test-ws:note1.md'],
  });
  (useSliceState as any).mockImplementation(() => {
    return {
      store,
      sliceState: workspaceSliceKey.getSliceState(store.state),
    };
  });

  renderHook(() => useRecentlyUsedWsPaths());

  expect(dispatchSpy).toBeCalledWith({
    id: expect.any(String),
    name: 'action::@bangle.io/slice-workspace:update-recently-used-ws-paths',
    value: {
      recentlyUsedWsPaths: ['test-ws:note1.md'],
      wsName: 'test-ws',
    },
  });
});

test('removes non existent wsPaths', () => {
  let records: RecencyRecords = [{ key: 'test-ws:note2.md', timestamps: [1] }],
    updateRecord = jest.fn();
  (useRecencyMonitor as any).mockImplementation(() => {
    return { records, updateRecord };
  });

  const { store, dispatchSpy } = createStore({
    wsName: 'test-ws',
    openedWsPaths: ['test-ws:note1.md'],
    wsPaths: ['test-ws:note1.md'],
  });
  (useSliceState as any).mockImplementation(() => {
    return {
      store,
      sliceState: workspaceSliceKey.getSliceState(store.state),
    };
  });

  renderHook(() => useRecentlyUsedWsPaths());

  expect(dispatchSpy).toBeCalledWith({
    id: expect.any(String),
    name: 'action::@bangle.io/slice-workspace:update-recently-used-ws-paths',
    value: {
      recentlyUsedWsPaths: [],
      wsName: 'test-ws',
    },
  });
});

test('works when no wsName', async () => {
  let records = [],
    updateRecord = jest.fn();
  (useRecencyMonitor as any).mockImplementation(() => {
    return { records, updateRecord };
  });

  const { store, dispatchSpy } = createStore({
    wsName: undefined,
    wsPaths: ['test-ws:note1.md'],
  });
  (useSliceState as any).mockImplementation(() => {
    return {
      store,
      sliceState: workspaceSliceKey.getSliceState(store.state),
    };
  });

  renderHook(() => useRecentlyUsedWsPaths());

  expect(updateRecord).toHaveBeenCalledTimes(0);
  expect(dispatchSpy).toBeCalledTimes(0);
});

test('updates the newly opened ws path only', async () => {
  getPageLocationMock.mockImplementation(() => () => ({
    pathname: wsPathToPathname('test-ws:note1.md'),
  }));
  let records = [],
    updateRecord = jest.fn();
  (useRecencyMonitor as any).mockImplementation(() => {
    return { records, updateRecord };
  });

  const { store } = createStore({
    wsName: 'test-ws',
    openedWsPaths: ['test-ws:note1.md'],
    wsPaths: ['test-ws:note1.md', 'test-ws:note2.md'],
  });

  (useSliceState as any).mockImplementation(() => {
    return {
      store,
      sliceState: workspaceSliceKey.getSliceState(store.state),
    };
  });

  const { rerender } = renderHook(() => useRecentlyUsedWsPaths());

  expect(updateRecord).toHaveBeenCalledTimes(1);
  expect(updateRecord).nthCalledWith(1, 'test-ws:note1.md');

  getPageLocationMock.mockImplementation(() => () => ({
    pathname: wsPathToPathname('test-ws:note1.md'),
    search: wsPathToSearch('test-ws:note2.md', ''),
  }));
  // to trigger the effect that sync location
  store.dispatch({ name: 'anyaction' } as any);

  await sleep(0);

  act(() => {
    rerender();
  });

  expect(updateRecord).toHaveBeenCalledTimes(2);
  expect(updateRecord).nthCalledWith(2, 'test-ws:note2.md');
});
