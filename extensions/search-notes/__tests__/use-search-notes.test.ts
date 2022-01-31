/**
 * @jest-environment jsdom
 */
import { renderHook } from '@testing-library/react-hooks';

import { useExtensionState } from '@bangle.io/extension-registry';
import { useWorkspaceContext } from '@bangle.io/slice-workspace';
import { naukarProxy } from '@bangle.io/worker-naukar-proxy';

import { useSearchNotes } from '../hooks';

jest.mock('@bangle.io/worker-naukar-proxy', () => {
  return {
    naukarProxy: {
      abortableSearchWsForPmNode: jest.fn(),
    },
  };
});

jest.mock('@bangle.io/slice-workspace', () => {
  return {
    useWorkspaceContext: jest.fn(),
  };
});

jest.mock('@bangle.io/extension-registry', () => {
  const actual = jest.requireActual('@bangle.io/extension-registry');
  return { ...actual, useExtensionState: jest.fn() };
});

jest.mock('../constants', () => {
  const actual = jest.requireActual('../constants');
  return {
    ...actual,
    DEBOUNCE_WAIT: 0,
    DEBOUNCE_MAX_WAIT: 0,
  };
});

let useWorkspaceContextReturn: { wsName: string | undefined } = {
  wsName: undefined,
};
let useExtensionStateReturn = [
  { searchQuery: '', searchResults: null, pendingSearch: false },
  jest.fn(),
];

let abortableSearchWsForPmNodeMock =
  naukarProxy.abortableSearchWsForPmNode as jest.MockedFunction<
    typeof naukarProxy.abortableSearchWsForPmNode
  >;

beforeEach(() => {
  useWorkspaceContextReturn = {
    wsName: undefined,
  };

  useExtensionStateReturn = [
    { searchQuery: '', searchResults: null, pendingSearch: false },
    jest.fn(),
  ];

  (useWorkspaceContext as any).mockImplementation(() => {
    return useWorkspaceContextReturn;
  });
  (useExtensionState as any).mockImplementation(() => {
    return useExtensionStateReturn;
  });
});

test('works with empty search query', async () => {
  useWorkspaceContextReturn.wsName = 'test-ws';

  let updateStateCalls: any[] = [];
  const updateState = jest.fn((_cb: any) => {
    updateStateCalls.push(_cb({}));
  });

  useExtensionStateReturn = [
    { searchQuery: '', searchResults: null, pendingSearch: false },
    updateState,
  ];

  renderHook(() => useSearchNotes());
  expect(updateState).toBeCalledTimes(0);
  expect(abortableSearchWsForPmNodeMock).toBeCalledTimes(0);
});

test('works with existing search query', async () => {
  abortableSearchWsForPmNodeMock.mockImplementation(async () => {
    return [
      {
        matches: [
          {
            match: ['', 'hello', ' world'],
            parent: 'listItem',
            parentPos: 2,
          },
        ],
        uid: 'test-ws:one.md',
      },
    ];
  });

  useWorkspaceContextReturn.wsName = 'test-ws';
  let updateStateCalls: any[] = [];
  const updateState = jest.fn((_cb: any) => {
    updateStateCalls.push(_cb({}));
  });

  useExtensionStateReturn = [
    { searchQuery: 'hello', searchResults: null, pendingSearch: false },
    updateState,
  ];

  const { result, waitForNextUpdate } = renderHook(() => useSearchNotes());

  // let debounce happen
  await waitForNextUpdate();

  expect(abortableSearchWsForPmNodeMock).toBeCalledTimes(1);
  expect(abortableSearchWsForPmNodeMock).nthCalledWith(
    1,
    expect.any(AbortSignal),
    'test-ws',
    'hello',
    [
      {
        dataAttrName: 'tagValue',
        nodeName: 'tag',
        printBefore: '#',
        queryIdentifier: 'tag:',
      },
      {
        dataAttrName: 'path',
        nodeName: 'wikiLink',
        printAfter: ']]',
        printBefore: '[[',
        queryIdentifier: 'backlink:',
      },
    ],
    {
      caseSensitive: false,
      concurrency: expect.any(Number),
      maxChars: expect.any(Number),
      perFileMatchMax: expect.any(Number),
      totalMatchMax: expect.any(Number),
    },
  );

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
        uid: 'test-ws:one.md',
      },
    ],
  });
});
