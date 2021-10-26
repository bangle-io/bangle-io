import { renderHook } from '@testing-library/react-hooks';

import { useExtensionStateContext } from '@bangle.io/extension-registry';
import { createPMNode } from '@bangle.io/test-utils/create-pm-node';
import { sleep } from '@bangle.io/utils';
import { useWorkspaceContext } from '@bangle.io/workspace-context';

import { useSearchNotes } from '../hooks';

jest.mock('@bangle.io/workspace-context', () => {
  return {
    useWorkspaceContext: jest.fn(),
  };
});

jest.mock('@bangle.io/extension-registry', () => {
  const actual = jest.requireActual('@bangle.io/extension-registry');
  return { ...actual, useExtensionStateContext: jest.fn() };
});

jest.mock('../constants', () => {
  const actual = jest.requireActual('../constants');
  return {
    ...actual,
    DEBOUNCE_WAIT: 0,
    DEBOUNCE_MAX_WAIT: 0,
  };
});

let useWorkspaceContextReturn, useExtensionStateContextReturn;

// let abortSpy;

// beforeEach(() => {
//   abortSpy = jest.spyOn(AbortController.prototype, 'abort');
// });
// afterEach(() => {
//   abortSpy.mockRestore();
// });

beforeEach(() => {
  useWorkspaceContextReturn = {
    wsName: undefined,
    noteWsPaths: [],
    getNote: jest.fn(),
  };

  useExtensionStateContextReturn = [
    { searchQuery: '', searchResults: null, pendingSearch: false },
    jest.fn(),
  ];

  (useWorkspaceContext as any).mockImplementation(() => {
    return useWorkspaceContextReturn;
  });
  (useExtensionStateContext as any).mockImplementation(() => {
    return useExtensionStateContextReturn;
  });
});

test('works with empty search query', async () => {
  useWorkspaceContextReturn.wsName = 'test-ws';
  useWorkspaceContextReturn.noteWsPaths = ['test-ws:one.md'];
  useWorkspaceContextReturn.getNote = jest.fn(async () => {
    return createPMNode()('- hello world');
  });
  let updateStateCalls: any[] = [];
  const updateState = jest.fn((_cb: any) => {
    updateStateCalls.push(_cb({}));
  });

  useExtensionStateContextReturn = [
    { searchQuery: '', searchResults: null, pendingSearch: false },
    updateState,
  ];

  renderHook(() => useSearchNotes());
  expect(updateState).toBeCalledTimes(0);
});

test('works with existing search query', async () => {
  useWorkspaceContextReturn.wsName = 'test-ws';
  useWorkspaceContextReturn.noteWsPaths = ['test-ws:one.md'];
  useWorkspaceContextReturn.getNote = jest.fn(async () => {
    return createPMNode()('- hello world');
  });
  let updateStateCalls: any[] = [];
  const updateState = jest.fn((_cb: any) => {
    updateStateCalls.push(_cb({}));
  });

  useExtensionStateContextReturn = [
    { searchQuery: 'hello', searchResults: null, pendingSearch: false },
    updateState,
  ];

  const { result, waitForNextUpdate } = renderHook(() => useSearchNotes());

  // let debounce happen
  await waitForNextUpdate();

  expect(result.current).toBe(undefined);
  expect(updateState).toBeCalledTimes(4);
  expect(updateStateCalls[0]).toEqual({
    searchResults: null,
  });
  expect(updateStateCalls[1]).toEqual({
    pendingSearch: true,
  });
  expect(updateStateCalls[2]).toEqual({
    pendingSearch: false,
  });
  expect(updateStateCalls[3]).toEqual({
    searchResults: [
      {
        matches: [
          {
            match: ['', 'hello', ' world'],
            parent: 'listItem',
            parentPos: 2,
          },
        ],
        wsPath: 'test-ws:one.md',
      },
    ],
  });
});
