import { act, renderHook } from '@testing-library/react-hooks';

import {
  initialBangleStore,
  useSliceState,
} from '@bangle.io/app-state-context';
import { RecencyRecords, sleep, useRecencyMonitor } from '@bangle.io/utils';

import { workspaceSliceKey } from '../common';
import { wsPathToPathname } from '../helpers';
import { useRecentlyUsedWsPaths } from '../use-recently-used-ws-paths';
import { workspaceSliceInitialState } from '../workspace-slice';
import { createStore } from './test-utils';

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

beforeEach(() => {
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
    locationPathname: wsPathToPathname('test-ws:note1.md'),
    wsPaths: ['test-ws:note1.md'],
  });
  (useSliceState as any).mockImplementation(() => {
    return {
      store,
      sliceState: workspaceSliceKey.getSliceState(store.state),
    };
  });

  renderHook(() => useRecentlyUsedWsPaths());

  expect(dispatchSpy).toBeCalledTimes(1);
  expect(dispatchSpy).nthCalledWith(1, {
    id: expect.any(String),
    name: 'action::workspace-context:update-recently-used-ws-paths',
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
    locationPathname: wsPathToPathname('test-ws:note1.md'),
    wsPaths: ['test-ws:note1.md'],
  });
  (useSliceState as any).mockImplementation(() => {
    return {
      store,
      sliceState: workspaceSliceKey.getSliceState(store.state),
    };
  });

  renderHook(() => useRecentlyUsedWsPaths());

  expect(dispatchSpy).toBeCalledTimes(1);
  expect(dispatchSpy).nthCalledWith(1, {
    id: expect.any(String),
    name: 'action::workspace-context:update-recently-used-ws-paths',
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
    locationPathname: '',
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
  let records = [],
    updateRecord = jest.fn();
  (useRecencyMonitor as any).mockImplementation(() => {
    return { records, updateRecord };
  });

  const { store } = createStore({
    locationPathname: wsPathToPathname('test-ws:note1.md'),
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

  store.dispatch({
    name: 'action::workspace-context:update-location',
    value: {
      locationPathname: wsPathToPathname('test-ws:note1.md'),
      locationSearchQuery: 'secondary=test-ws%3Anote2.md',
    },
  });

  await sleep(0);

  act(() => {
    rerender();
  });

  expect(updateRecord).toHaveBeenCalledTimes(2);
  expect(updateRecord).nthCalledWith(2, 'test-ws:note2.md');
});
