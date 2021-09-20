import { act, fireEvent, render } from '@testing-library/react';
import { useEditorManagerContext } from 'editor-manager-context';
import React from 'react';
import { createPMNode } from 'test-utils/create-pm-node';
import { sleep } from 'utils';
import { useWorkspaceContext } from 'workspace-context';
import { SearchNotesSidebar } from '../components/SearchNotesSidebar';

jest.mock('react-router-dom', () => {
  return {
    Link: function Link({ children }) {
      return <span>{children}</span>;
    },
  };
});
jest.mock('workspace-context', () => {
  return {
    useWorkspaceContext: jest.fn(),
  };
});
jest.mock('editor-manager-context', () => {
  return {
    useEditorManagerContext: jest.fn(),
  };
});
jest.mock('../constants', () => {
  const actual = jest.requireActual('../constants');
  return {
    ...actual,
    DEBOUNCE_WAIT: 0,
    DEBOUNCE_MAX_WAIT: 0,
  };
});

jest.mock('../hooks', () => {
  const actual = jest.requireActual('../hooks');

  return {
    ...actual,
    useSearchNotesState: jest.fn(() => [{ searchQuery: '' }, jest.fn()]),
  };
});

let useWorkspaceContextReturn;
let useEditorManagerContextReturn;
beforeEach(() => {
  useWorkspaceContextReturn = {
    wsName: undefined,
    noteWsPaths: [],
    getNote: jest.fn(),
  };
  useEditorManagerContextReturn = {
    forEachEditor: jest.fn(),
  };
  (useWorkspaceContext as any).mockImplementation(() => {
    return useWorkspaceContextReturn;
  });

  (useEditorManagerContext as any).mockImplementation(() => {
    return useEditorManagerContextReturn;
  });
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

test('show results if match', async () => {
  useWorkspaceContextReturn.wsName = 'test-ws';
  useWorkspaceContextReturn.noteWsPaths = ['test-ws:one.md'];
  useWorkspaceContextReturn.getNote = jest.fn(async () => {
    return createPMNode()('- hello world');
  });
  const renderResult = render(<SearchNotesSidebar />);
  const input = renderResult.getByLabelText('Search', { selector: 'input' });

  await act(async () => {
    fireEvent.change(input, { target: { value: 'hello' } });
    await sleep();
  });

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
  expect(useWorkspaceContextReturn.getNote).toBeCalledTimes(1);
});

test('if multiple matches', async () => {
  useWorkspaceContextReturn.wsName = 'test-ws';
  useWorkspaceContextReturn.noteWsPaths = [
    'test-ws:one.md',
    'test-ws:two.md',
    'test-ws:three.md',
  ];
  useWorkspaceContextReturn.getNote = jest.fn(async (wsPath) => {
    if (wsPath.endsWith('one.md')) {
      return createPMNode()('- hello world');
    }
    if (wsPath.endsWith('two.md')) {
      return createPMNode()('nice people\n in the world');
    }
    if (wsPath.endsWith('three.md')) {
      return createPMNode()('people say hello to greet');
    }
  });
  const renderResult = render(<SearchNotesSidebar />);
  const input = renderResult.getByLabelText('Search', { selector: 'input' });

  await act(async () => {
    fireEvent.change(input, { target: { value: 'hello' } });
    await sleep();
  });

  expect(
    Array.from(
      renderResult.container.querySelectorAll('.search-result-note-match'),
    ).length,
  ).toBe(2);

  expect(
    Array.from(
      renderResult.container.querySelectorAll('.search-result-text-match'),
    ).length,
  ).toBe(2);

  expect(useWorkspaceContextReturn.getNote).toBeCalledTimes(3);
});

test('no result if no match', async () => {
  useWorkspaceContextReturn.wsName = 'test-ws';
  useWorkspaceContextReturn.noteWsPaths = ['test-ws:one.md'];
  useWorkspaceContextReturn.getNote = jest.fn(async () => {
    return createPMNode()('- hello world');
  });
  const renderResult = render(<SearchNotesSidebar />);
  const input = renderResult.getByLabelText('Search', { selector: 'input' });

  await act(async () => {
    fireEvent.change(input, { target: { value: 'bye' } });
    await sleep();
  });

  expect(
    Array.from(
      renderResult.container.querySelectorAll('.search-result-note-match'),
    ).length,
  ).toBe(0);

  expect(
    Array.from(
      renderResult.container.querySelectorAll('.search-result-text-match'),
    ).length,
  ).toBe(0);

  expect(renderResult.container.innerHTML.includes('No match found')).toBe(
    true,
  );
  expect(useWorkspaceContextReturn.getNote).toBeCalledTimes(1);
});
