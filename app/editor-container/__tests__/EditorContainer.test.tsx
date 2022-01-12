import { act, render, waitFor } from '@testing-library/react';
import React from 'react';

import { Editor } from '@bangle.io/editor';
import { useEditorManagerContext } from '@bangle.io/slice-editor-manager';
import {
  checkFileExists,
  useWorkspaceContext,
} from '@bangle.io/slice-workspace';
import {
  getUseEditorManagerContextReturn,
  getUseWorkspaceContextReturn,
} from '@bangle.io/test-utils/function-mock-return';

import { EditorContainer } from '../EditorContainer';

jest.mock('@bangle.io/slice-workspace', () => {
  const actual = jest.requireActual('@bangle.io/slice-workspace');
  return {
    ...actual,
    checkFileExists: jest.fn(() => () => Promise.resolve(true)),
    useWorkspaceContext: jest.fn(),
  };
});

jest.mock('@bangle.io/slice-editor-manager', () => {
  const actual = jest.requireActual('@bangle.io/slice-editor-manager');
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

let useEditorManagerContextMock =
  useEditorManagerContext as jest.MockedFunction<
    typeof useEditorManagerContext
  >;

let checkFileExistsMock = checkFileExists as jest.MockedFunction<
  typeof checkFileExists
>;

let result: ReturnType<typeof render>;

beforeEach(() => {
  (Editor as any).mockImplementation(() => {
    return <div data-testid="mock-editor">MOCK_EDITOR</div>;
  });

  (useWorkspaceContext as any).mockImplementation(() => {
    return { ...getUseWorkspaceContextReturn };
  });

  useEditorManagerContextMock.mockImplementation(() => {
    return {
      ...getUseEditorManagerContextReturn,
    };
  });
  checkFileExistsMock.mockImplementation(() => async () => true);
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
      className: `editor-container_editor editor-container_editor-1`,
    },
    {},
  );
  expect(result!.container).toMatchSnapshot();
});

test('renders correctly when file does not exist', async () => {
  checkFileExistsMock.mockImplementation(() => async () => false);

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
      className: `editor-container_editor editor-container_editor-1`,
    },
    {},
  );
});
