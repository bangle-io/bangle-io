/**
 * @jest-environment jsdom
 */
import { act, fireEvent, render } from '@testing-library/react';
import React from 'react';

import type { SearchResultItem } from '@bangle.io/search-pm-node';
import { useWorkspaceContext } from '@bangle.io/slice-workspace';
import { getUseWorkspaceContextReturn } from '@bangle.io/test-utils/function-mock-return';
import { sleep } from '@bangle.io/utils';

import { SearchNotesSidebar } from '../components/SearchNotesSidebar';
import { useSearchNotesState } from '../hooks';

jest.mock('@bangle.io/contextual-ui-components', () => {
  const actual = jest.requireActual('@bangle.io/contextual-ui-components');

  return {
    ...actual,
    NoteLink: ({ children }) => {
      return <span>{children}</span>;
    },
  };
});

jest.mock('@bangle.io/slice-workspace');

jest.mock('../hooks', () => {
  const actual = jest.requireActual('../hooks');

  return {
    ...actual,
    useHighlightEditors: jest.fn(),
    useSearchNotesState: jest.fn(),
  };
});

let useWorkspaceContextReturn: Partial<typeof getUseWorkspaceContextReturn>;

const useWorkspaceContextMock = useWorkspaceContext as jest.MockedFunction<
  typeof useWorkspaceContext
>;
beforeEach(() => {
  useWorkspaceContextReturn = {
    wsName: undefined,
    noteWsPaths: [],
  };

  useWorkspaceContextMock.mockImplementation(() => {
    return {
      ...getUseWorkspaceContextReturn,
      ...useWorkspaceContextReturn,
    };
  });

  (useSearchNotesState as any).mockImplementation(() => [
    { searchQuery: '', searchResults: null, pendingSearch: false },
    jest.fn(),
  ]);
});

test('renders correctly is no workspace is opened', async () => {
  const renderResult = render(<SearchNotesSidebar />);

  expect(renderResult.container).toMatchInlineSnapshot(`
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
  useWorkspaceContextReturn.wsName = 'test-ws';
  const renderResult = render(<SearchNotesSidebar />);

  expect(renderResult.container).toMatchSnapshot();
});

test('show search results', async () => {
  const searchResultItem: SearchResultItem = {
    uid: 'test-ws:one.md',
    matches: [{ parent: 'para', parentPos: 0, match: ['hello', ' world'] }],
  };
  useWorkspaceContextReturn.wsName = 'test-ws';
  useWorkspaceContextReturn.noteWsPaths = ['test-ws:one.md'];
  (useSearchNotesState as any).mockImplementation(() => {
    return [
      {
        searchQuery: '',
        searchResults: [searchResultItem],
        pendingSearch: false,
      },
      jest.fn(),
    ];
  });

  const renderResult = render(<SearchNotesSidebar />);

  expect(
    Array.from(
      renderResult.container.querySelectorAll('.search-result-note-match'),
    ).length,
  ).toBe(1);

  expect(
    Array.from(
      renderResult.container.querySelectorAll(
        '[data-id="search-result-text-match-0"]',
      ),
    ).length,
  ).toBe(1);

  expect(renderResult.container).toMatchSnapshot();
});

test('typing in input triggers extension state update', async () => {
  useWorkspaceContextReturn.wsName = 'test-ws';
  useWorkspaceContextReturn.noteWsPaths = ['test-ws:one.md'];
  let updateStateCb: any;
  const updateState = jest.fn((_cb) => {
    updateStateCb = _cb;
  });

  (useSearchNotesState as any).mockImplementation(() => {
    return [
      {
        searchQuery: '',
        searchResults: [],
        pendingSearch: false,
      },
      updateState,
    ];
  });

  const renderResult = render(<SearchNotesSidebar />);
  const input = renderResult.getByLabelText('Search', { selector: 'input' });

  await act(async () => {
    fireEvent.change(input, { target: { value: 'hello' } });
    await sleep();
  });

  expect(updateState).toBeCalledTimes(1);
  // passing a:1 to test if existing properties are retained or not
  expect(updateStateCb({ a: 1 })).toEqual({ a: 1, searchQuery: 'hello' });
});

test('pendingSearch shows a spinner', async () => {
  useWorkspaceContextReturn.wsName = 'test-ws';
  useWorkspaceContextReturn.noteWsPaths = ['test-ws:one.md'];

  (useSearchNotesState as any).mockImplementation(() => {
    return [
      {
        searchQuery: '',
        searchResults: [],
        pendingSearch: true,
      },
      jest.fn(),
    ];
  });

  const renderResult = render(<SearchNotesSidebar />);

  expect(Boolean(renderResult.container.querySelector('.spinner-icon'))).toBe(
    true,
  );
});

test('pendingSearch=false does not show spinner', async () => {
  useWorkspaceContextReturn.wsName = 'test-ws';
  useWorkspaceContextReturn.noteWsPaths = ['test-ws:one.md'];

  (useSearchNotesState as any).mockImplementation(() => {
    return [
      {
        searchQuery: '',
        searchResults: [],
        pendingSearch: false,
      },
      jest.fn(),
    ];
  });

  const renderResult = render(<SearchNotesSidebar />);

  expect(Boolean(renderResult.container.querySelector('.spinner-icon'))).toBe(
    false,
  );
});
