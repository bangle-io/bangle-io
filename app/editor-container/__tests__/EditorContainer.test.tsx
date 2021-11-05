import { act, render, waitFor } from '@testing-library/react';
import React from 'react';

import { defaultPlugins, defaultSpecs } from '@bangle.dev/all-base-components';
import { Node } from '@bangle.dev/pm';

import { Extension, ExtensionRegistry } from '@bangle.io/extension-registry';
import { useWorkspaceContext } from '@bangle.io/workspace-context';

import { EditorContainer } from '..';

const coreExtension = Extension.create({
  name: 'bangle-io-core',
  editor: {
    specs: defaultSpecs(),
    plugins: defaultPlugins(),
  },
});

const extensionRegistry = new ExtensionRegistry([coreExtension]);

jest.mock('@bangle.io/workspace-context', () => {
  const actual = jest.requireActual('@bangle.io/workspace-context');
  return {
    ...actual,
    useWorkspaceContext: jest.fn(),
  };
});

jest.mock('../config', () => {
  const actual = jest.requireActual('../config');
  return {
    ...actual,
    EDITOR_LOAD_WAIT_TIME: 0,
  };
});

const generateDoc = (text = 'Hello world! I am a test') =>
  Node.fromJSON(extensionRegistry.specRegistry.schema, {
    type: 'doc',
    content: [
      {
        type: 'heading',
        attrs: {
          level: 1,
        },
        content: [
          {
            type: 'text',
            text: 'Hola',
          },
        ],
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text,
          },
        ],
      },
    ],
  });

let checkFileExists, getNote, result: ReturnType<typeof render>;

beforeEach(() => {
  checkFileExists = jest.fn().mockResolvedValue(true);
  getNote = jest.fn().mockResolvedValue(generateDoc());

  (useWorkspaceContext as any).mockImplementation(() => {
    return {
      getNote,
      checkFileExists,
    };
  });
});

test('basic renders', async () => {
  let setEditor = jest.fn();
  act(() => {
    result = render(
      <div>
        <EditorContainer
          editorId={1}
          extensionRegistry={extensionRegistry}
          setEditor={setEditor}
          widescreen={true}
          wsPath="something:blah.md"
        />
      </div>,
    );
  });

  await waitFor(() => {
    expect(result.container.innerHTML).toContain(
      'class="editor-container_editor',
    );
  });

  expect(checkFileExists).nthCalledWith(1, 'something:blah.md');

  expect(setEditor).toBeCalledTimes(1);
  expect(result!.container.innerHTML).toContain('Hello world! I am a test');
  expect(result!.container).toMatchSnapshot();
});

test('renders correctly when file does not exist', async () => {
  checkFileExists = jest.fn().mockResolvedValue(false);

  act(() => {
    result = render(
      <div>
        <EditorContainer
          editorId={1}
          extensionRegistry={extensionRegistry}
          setEditor={jest.fn()}
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
        <EditorContainer
          editorId={1}
          extensionRegistry={extensionRegistry}
          setEditor={jest.fn()}
          widescreen={true}
          wsPath={undefined}
        />
      </div>,
    );
  });

  await result!.findByText('Nothing was found here');

  expect(checkFileExists).toHaveBeenCalledTimes(0);
  expect(result!.container).toMatchSnapshot();
});

test('changing of wsPath works', async () => {
  let setEditor = jest.fn();
  getNote = jest.fn(async (wsPath) => {
    if (wsPath.endsWith('one.md')) {
      return generateDoc('one note');
    }
    if (wsPath.endsWith('two.md')) {
      return generateDoc('two note');
    }
    throw new Error('Unknown wsPath');
  });

  act(() => {
    result = render(
      <div>
        <EditorContainer
          editorId={1}
          extensionRegistry={extensionRegistry}
          setEditor={setEditor}
          widescreen={true}
          wsPath="something:one.md"
        />
      </div>,
    );
  });

  await waitFor(() => {
    expect(result.container.innerHTML).toContain(
      'class="editor-container_editor',
    );
  });

  expect(checkFileExists).nthCalledWith(1, 'something:one.md');

  expect(result!.container.innerHTML).toContain('one note');

  act(() => {
    result.rerender(
      <div>
        <EditorContainer
          editorId={1}
          extensionRegistry={extensionRegistry}
          setEditor={setEditor}
          widescreen={true}
          wsPath="something:two.md"
        />
      </div>,
    );
  });

  await waitFor(() => {
    expect(result.container.innerHTML).toContain(
      'class="editor-container_editor',
    );
  });

  expect(setEditor).toBeCalledTimes(2);

  expect(result!.container.innerHTML).toContain('two note');
});
