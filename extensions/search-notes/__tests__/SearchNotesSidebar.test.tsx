/**
 * @jest-environment @bangle.io/jsdom-env
 */
import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { ui } from '@bangle.io/api';
import { EXECUTE_SEARCH_OPERATION } from '@bangle.io/constants';
import type { SearchResultItem } from '@bangle.io/search-pm-node';
import {
  createBasicTestStore,
  setupMockWorkspaceWithNotes,
  TestStoreProvider,
} from '@bangle.io/test-utils';
import { sleep } from '@bangle.io/utils';
import { naukarProxy } from '@bangle.io/worker-naukar-proxy';

import { SearchNotesSidebar } from '../components/SearchNotesSidebar';
import { SEARCH_SIDEBAR_NAME, searchNotesSliceKey } from '../constants';
import searchNotesExtension from '../index';
import { updateSliceState } from '../search-notes-slice';

jest.mock('@bangle.io/worker-naukar-proxy', () => {
  return {
    naukarProxy: {
      abortableSearchWsForPmNode: jest.fn(),
    },
  };
});

let abortableSearchWsForPmNodeMock = jest.mocked(
  naukarProxy.abortableSearchWsForPmNode,
);
let abortController = new AbortController();
let signal = abortController.signal;

beforeEach(() => {
  abortController = new AbortController();
  signal = abortController.signal;
});

afterEach(() => {
  abortController.abort();
});

const setup = async (
  wsName: string | null = 'test-ws',
  // Array of [wsPath, MarkdownString]
  noteWsPaths: Array<[string, string]> = [
    [`${wsName}:one.md`, `# Hello World 0`],
    [`${wsName}:two.md`, `# Hello World 1`],
  ],
) => {
  let { store, getActionNames, getAction } = createBasicTestStore({
    signal,
    extensions: [searchNotesExtension],
    useEditorManagerSlice: true,
    useUISlice: true,
  });

  if (wsName) {
    await setupMockWorkspaceWithNotes(store, wsName, noteWsPaths);
  }

  return {
    store,
    getActionNames,
    getAction,
    render: () => {
      let counter = 0;
      let { container, rerender } = render(
        <TestStoreProvider
          editorManagerContextProvider
          bangleStore={store}
          bangleStoreChanged={counter}
        >
          <SearchNotesSidebar />
        </TestStoreProvider>,
      );

      return {
        container,
        rerender: () => {
          counter++;

          return rerender(
            <TestStoreProvider
              editorManagerContextProvider
              bangleStore={store}
              bangleStoreChanged={counter}
            >
              <SearchNotesSidebar />
            </TestStoreProvider>,
          );
        },
      };
    },
  };
};

test('renders correctly is no workspace is opened', async () => {
  const { render } = await setup(null);
  const { container } = render();

  expect(container).toMatchInlineSnapshot(`
    <div>
      <div
        class="flex flex-col items-center justify-center h-full"
      >
        <span
          class="text-sm font-extrabold cursor-pointer"
        >
          Please open a workspace to search
        </span>
      </div>
    </div>
  `);
});

test('renders correctly workspace is opened', async () => {
  const { render } = await setup();
  const { container } = render();

  expect(container).toMatchSnapshot();
});

test('show search results', async () => {
  const { render, store } = await setup();

  const searchResultItem: SearchResultItem = {
    uid: 'test-ws:one.md',
    matches: [{ parent: 'para', parentPos: 0, match: ['hello', ' world'] }],
  };

  const { container, rerender } = render();

  updateSliceState({
    searchResults: [searchResultItem],
    pendingSearch: false,
  })(store.state, store.dispatch);

  rerender();

  expect(
    Array.from(
      container.querySelectorAll('.B-search-notes_search-result-note-match'),
    ).length,
  ).toBe(1);

  expect(
    Array.from(
      container.querySelectorAll('[data-id="search-result-text-match-0"]'),
    ).length,
  ).toBe(1);

  expect(container).toMatchSnapshot();
});

test('typing in input triggers extension state update', async () => {
  const { render, store, getAction } = await setup();

  render();
  const input = screen.getByLabelText('Search', { selector: 'input' });

  await act(async () => {
    fireEvent.change(input, { target: { value: 'hello' } });

    // wait for debounce
    await sleep(100);
  });

  expect(
    searchNotesSliceKey.getSliceStateAsserted(store.state).searchQuery,
  ).toEqual('hello');

  expect(
    getAction('action::@bangle.io/search-notes:input-search-query'),
  ).toEqual([
    {
      id: expect.any(String),
      name: 'action::@bangle.io/search-notes:input-search-query',
      value: {
        query: 'hello',
      },
    },
  ]);

  expect(getAction('action::@bangle.io/search-notes:update-state')).toEqual([
    {
      id: expect.any(String),
      name: 'action::@bangle.io/search-notes:update-state',
      value: {
        pendingSearch: false,
        searchResults: null,
      },
    },
    {
      id: expect.any(String),
      name: 'action::@bangle.io/search-notes:update-state',
      value: {
        pendingSearch: true,
        searchResults: null,
      },
    },
    {
      id: expect.any(String),
      name: 'action::@bangle.io/search-notes:update-state',
      value: {
        pendingSearch: false,
        searchResults: undefined,
      },
    },
  ]);
});

test('pendingSearch shows a spinner', async () => {
  const { render, store } = await setup();

  const { rerender } = render();

  updateSliceState({
    searchResults: [],
    pendingSearch: true,
  })(store.state, store.dispatch);

  rerender();

  expect(Boolean(screen.queryByLabelText('search spinner'))).toBe(true);

  updateSliceState({
    searchResults: [],
    pendingSearch: false,
  })(store.state, store.dispatch);

  rerender();

  expect(Boolean(screen.queryByLabelText('search spinner'))).toBe(false);
});

describe('operations', () => {
  let originalQuerySelector = document.querySelector;
  beforeEach(() => {
    document.querySelector = originalQuerySelector;
  });

  test('focuses correctly on input if sidebar is already open', async () => {
    const inputElement = {
      focus: jest.fn(),
      select: jest.fn(),
    };
    document.querySelector = jest.fn(() => inputElement);

    const { store, render } = await setup();

    ui.setSidebar(SEARCH_SIDEBAR_NAME)(store.state, store.dispatch);

    render();

    searchNotesExtension.application.operationHandler?.().handle(
      {
        name: 'operation::@bangle.io/search-notes:show-search-sidebar',
      },
      undefined,
      store,
    );

    expect(ui.uiSliceKey.getSliceStateAsserted(store.state).sidebar).toBe(
      SEARCH_SIDEBAR_NAME,
    );

    // for the delayed input focus
    await sleep(0);

    expect(document.querySelector).toBeCalledTimes(1);
    expect(document.querySelector).nthCalledWith(
      1,
      `input[aria-label="Search"]`,
    );
    expect(inputElement.focus).toBeCalledTimes(1);
    expect(inputElement.select).toBeCalledTimes(1);
  });

  test('execute search operation updates extension state correctly', async () => {
    const inputElement = {
      focus: jest.fn(),
      select: jest.fn(),
    };
    document.querySelector = jest.fn(() => inputElement);

    const { store, render } = await setup();

    render();

    searchNotesExtension.application.operationHandler?.().handle(
      {
        name: EXECUTE_SEARCH_OPERATION,
        value: 'hello world',
      },
      'hello world',
      store,
    );

    expect(ui.uiSliceKey.getSliceStateAsserted(store.state).sidebar).toBe(
      SEARCH_SIDEBAR_NAME,
    );

    expect(searchNotesSliceKey.getSliceStateAsserted(store.state)).toEqual({
      externalInputChange: 1,
      pendingSearch: false,
      searchQuery: 'hello world',
      searchResults: null,
    });

    searchNotesExtension.application.operationHandler?.().handle(
      {
        name: EXECUTE_SEARCH_OPERATION,
        value: 'hello world',
      },
      'hello world',
      store,
    );

    expect(searchNotesSliceKey.getSliceStateAsserted(store.state)).toEqual({
      externalInputChange: 2,
      pendingSearch: false,
      searchQuery: 'hello world',
      searchResults: null,
    });
  });
});

describe('search results', () => {
  test('works with search query', async () => {
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

    const { store, getAction, render } = await setup();

    const { rerender } = render();

    const input = screen.getByLabelText('Search', { selector: 'input' });

    await act(async () => {
      fireEvent.change(input, { target: { value: 'hello' } });
      await sleep(100);
    });

    rerender();

    // wait for sideeffect to run
    await sleep(0);

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

    expect(
      getAction('action::@bangle.io/search-notes:input-search-query'),
    ).toEqual([
      {
        id: expect.any(String),
        name: 'action::@bangle.io/search-notes:input-search-query',
        value: {
          query: 'hello',
        },
      },
    ]);

    expect(getAction('action::@bangle.io/search-notes:update-state')).toEqual([
      {
        id: expect.any(String),
        name: 'action::@bangle.io/search-notes:update-state',
        value: {
          pendingSearch: false,
          searchResults: null,
        },
      },
      {
        id: expect.any(String),
        name: 'action::@bangle.io/search-notes:update-state',
        value: {
          pendingSearch: true,
          searchResults: null,
        },
      },
      {
        id: expect.any(String),
        name: 'action::@bangle.io/search-notes:update-state',
        value: {
          pendingSearch: false,
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
        },
      },
    ]);
  });
});
