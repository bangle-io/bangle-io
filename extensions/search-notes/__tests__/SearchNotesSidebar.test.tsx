/**
 * @jest-environment @bangle.io/jsdom-env
 */
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import React from 'react';
import searchNotesExtension from '../index';

import { setupTestExtension, waitForExpect } from '@bangle.io/test-utils-2';
import { SearchNotesSidebar } from '../components/SearchNotesSidebar';
import { nsmApi2, wsPathHelpers } from '@bangle.io/api';
import { sleep } from '@bangle.io/utils';
import { SearchResultItem } from '@bangle.io/search-pm-node';
import { searchSlice, updateSliceState } from '../search-notes-slice';
let abortController = new AbortController();

beforeEach(() => {
  abortController = new AbortController();
});

afterEach(async () => {
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
  const ctx = setupTestExtension({
    abortSignal: abortController.signal,
    extensions: [searchNotesExtension],
    editor: true,
    storeName: 'store:' + wsName,
  });

  if (wsName) {
    await ctx.createWorkspace(wsName);
    await ctx.createNotes(noteWsPaths, { loadFirst: true });

    const targetPath = wsPathHelpers.createWsPath(noteWsPaths?.[0]?.[0]);
    nsmApi2.workspace.pushPrimaryWsPath(targetPath);

    await waitForExpect(() => {
      expect(nsmApi2.workspace.workspaceState().primaryWsPath).toEqual(
        targetPath,
      );
    });
  }

  return {
    store: ctx.testStore,
    render: async () => {
      let counter = 0;
      let { container, rerender } = render(
        <ctx.ContextProvider>
          <SearchNotesSidebar />
        </ctx.ContextProvider>,
      );

      return {
        container,
        rerender: () => {
          counter++;

          return rerender(
            <ctx.ContextProvider>
              <SearchNotesSidebar />
            </ctx.ContextProvider>,
          );
        },
      };
    },
  };
};

test('renders correctly is no workspace is opened', async () => {
  const { render } = await setup(null);
  const { container } = await render();

  expect(container).toMatchInlineSnapshot(`
    <div>
      <div
        class="flex flex-col items-center justify-center h-full"
      >
        <span
          class="text-sm font-extrabold cursor-pointer text-colorNeutralTextSubdued"
        >
          Please open a workspace to search
        </span>
      </div>
    </div>
  `);
});

test('renders correctly workspace is opened', async () => {
  const { render } = await setup('test-ws-2');
  const { container } = await render();

  expect(container).toMatchSnapshot();
});

test('show search results', async () => {
  const { render, store } = await setup('test-ws-3');

  const searchResultItem: SearchResultItem = {
    uid: 'test-ws-3:one.md',
    matches: [{ parent: 'para', parentPos: 0, match: ['hello', ' world'] }],
  };

  const { container, rerender } = await render();

  store.dispatch(
    updateSliceState({
      searchResults: [searchResultItem],
      pendingSearch: false,
    }),
  );

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
  const { render, store } = await setup('test-ws-4');

  render();

  const input = screen.getByLabelText('Search', { selector: 'input' });

  fireEvent.change(input, { target: { value: 'hello' } });

  await waitForExpect(() => {
    expect(searchSlice.get(store.state).searchQuery).toEqual('hello');
  });
});

test('pendingSearch shows a spinner', async () => {
  const { render, store } = await setup('test-ws-5');

  const { rerender } = await render();

  store.dispatch(
    updateSliceState({
      pendingSearch: true,
    }),
  );

  rerender();

  expect(Boolean(screen.queryByLabelText('search spinner'))).toBe(true);

  store.dispatch(
    updateSliceState({
      pendingSearch: false,
    }),
  );
  rerender();

  expect(Boolean(screen.queryByLabelText('search spinner'))).toBe(false);
});

describe('search results', () => {
  test('works with search query', async () => {
    const { store, render } = await setup('test-ws-6', [
      [`test-ws-6:one.md`, `# Hello kjoshi 0`],
      [`test-ws-6:two.md`, `# Hello World 1`],
      [
        `test-ws-6:three.md`,
        `# Hello World 3 

>       kjoshi`,
      ],
    ]);

    const { rerender } = await render();

    const input = screen.getByLabelText('Search', { selector: 'input' });

    fireEvent.change(input, { target: { value: 'kjoshi' } });

    rerender();

    await waitFor(() => {
      expect(screen.getByText('Found 2 notes')).toBeDefined();
    });

    expect(screen.queryAllByText('kjoshi')).toMatchInlineSnapshot(`
      [
        <span
          class="B-search-notes_highlight-text text-sm"
        >
          kjoshi
        </span>,
        <span
          class="B-search-notes_highlight-text text-sm"
        >
          kjoshi
        </span>,
      ]
    `);

    // firing another query works
    fireEvent.change(input, { target: { value: 'hello' } });

    rerender();

    await waitFor(() => {
      expect(screen.getByText('Found 3 notes')).toBeDefined();
    });
  });
});
