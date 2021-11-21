import { act, render, waitFor } from '@testing-library/react';
import React from 'react';

import { Editor } from '@bangle.io/editor';
import { useEditorManagerContext } from '@bangle.io/editor-manager-context';
import { useWorkspaceContext } from '@bangle.io/workspace-context';

import { EditorContainer } from '../EditorContainer';

jest.mock('@bangle.io/workspace-context', () => {
  const actual = jest.requireActual('@bangle.io/workspace-context');
  return {
    ...actual,
    useWorkspaceContext: jest.fn(),
  };
});
jest.mock('@bangle.io/editor-manager-context', () => {
  const actual = jest.requireActual('@bangle.io/editor-manager-context');
  return {
    ...actual,
    useEditorManagerContext: jest.fn(),
  };
});

jest.mock('@bangle.io/editor', () => {
  const actual = jest.requireActual('@bangle.io/editor');
  return {
    ...actual,
    Editor: jest.fn(),
  };
});

jest.mock('../config', () => {
  const actual = jest.requireActual('../config');
  return {
    ...actual,
    EDITOR_LOAD_WAIT_TIME: 0,
  };
});

let checkFileExists, result: ReturnType<typeof render>, setEditor;

beforeEach(() => {
  checkFileExists = jest.fn().mockResolvedValue(true);
  setEditor = jest.fn();

  (Editor as any).mockImplementation(() => {
    return <div data-testid="mock-editor">MOCK_EDITOR</div>;
  });

  (useWorkspaceContext as any).mockImplementation(() => {
    return {
      checkFileExists,
    };
  });

  (useEditorManagerContext as any).mockImplementation(() => {
    return {
      setEditor,
    };
  });
});

test('basic renders', async () => {
  act(() => {
    result = render(
      <div>
        <EditorContainer
          editorId={1}
          widescreen={true}
          wsPath="something:blah.md"
        />
      </div>,
    );
  });

  await waitFor(() => {
    expect(result.getByTestId('mock-editor')).toBeTruthy();
  });

  expect(checkFileExists).nthCalledWith(1, 'something:blah.md');

  expect(Editor).lastCalledWith(
    {
      editorId: 1,
      wsPath: 'something:blah.md',
      onEditorReady: expect.any(Function),
      className: `editor-container_editor editor-container_editor-1`,
    },
    {},
  );
  expect(result!.container).toMatchSnapshot();
});

test('renders correctly when file does not exist', async () => {
  checkFileExists = jest.fn().mockResolvedValue(false);

  act(() => {
    result = render(
      <div>
        <EditorContainer
          editorId={1}
          widescreen={true}
          wsPath="something:blah.md"
        />
      </div>,
    );
  });

  await result!.findByText('🕵️‍♀️‍ Note "blah.md" was not found');

  expect(result!.container.innerHTML).toContain(`was not found`);
  expect(result!.container).toMatchSnapshot();
});

test('renders when no wsPath is provided', async () => {
  act(() => {
    result = render(
      <div>
        <EditorContainer editorId={1} widescreen={true} wsPath={undefined} />
      </div>,
    );
  });

  await result!.findByText('Nothing was found here');

  expect(checkFileExists).toHaveBeenCalledTimes(0);
  expect(result!.container).toMatchSnapshot();
});

test('changing of wsPath works', async () => {
  act(() => {
    result = render(
      <div>
        <EditorContainer
          editorId={1}
          widescreen={true}
          wsPath="something:one.md"
        />
      </div>,
    );
  });

  await waitFor(() => {
    expect(result.getByTestId('mock-editor')).toBeTruthy();
  });

  expect(checkFileExists).nthCalledWith(1, 'something:one.md');

  expect(Editor).lastCalledWith(
    {
      editorId: 1,
      wsPath: 'something:one.md',
      onEditorReady: expect.any(Function),
      className: `editor-container_editor editor-container_editor-1`,
    },
    {},
  );

  act(() => {
    result.rerender(
      <div>
        <EditorContainer
          editorId={1}
          widescreen={true}
          wsPath="something:two.md"
        />
      </div>,
    );
  });

  await waitFor(() => {
    expect(result.getByTestId('mock-editor')).toBeTruthy();
  });

  expect(Editor).lastCalledWith(
    {
      editorId: 1,
      wsPath: 'something:two.md',
      onEditorReady: expect.any(Function),
      className: `editor-container_editor editor-container_editor-1`,
    },
    {},
  );
});
