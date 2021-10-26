import { act, fireEvent, render } from '@testing-library/react';
import React from 'react';

import { sleep } from '@bangle.io/utils';
import { useWorkspaceContext } from '@bangle.io/workspace-context';

import { SearchNotesSidebar } from '../components/SearchNotesSidebar';
import { SearchResultItem } from '../constants';
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

jest.mock('@bangle.io/workspace-context', () => {
  return {
    useWorkspaceContext: jest.fn(),
  };
});

jest.mock('../hooks', () => {
  const actual = jest.requireActual('../hooks');

  return {
    ...actual,
    useHighlightEditors: jest.fn(),
    useSearchNotesState: jest.fn(),
  };
});

let useWorkspaceContextReturn;
beforeEach(() => {
  useWorkspaceContextReturn = {
    wsName: undefined,
    noteWsPaths: [],
    getNote: jest.fn(),
  };

  (useWorkspaceContext as any).mockImplementation(() => {
    return useWorkspaceContextReturn;
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
        class="h-full flex flex-col items-center justify-center"
      >
        <span
          class="text-sm font-extrabold b-text-color-lighter cursor-pointer"
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
    wsPath: 'test-ws:one.md',
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
      renderResult.container.querySelectorAll('.search-result-text-match'),
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
