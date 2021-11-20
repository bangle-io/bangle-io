import { act, render, waitFor } from '@testing-library/react';
import { renderHook } from '@testing-library/react-hooks';
import React from 'react';

import { defaultPlugins, defaultSpecs } from '@bangle.dev/all-base-components';
import { Node } from '@bangle.dev/pm';

import {
  Extension,
  ExtensionRegistry,
  useExtensionRegistryContext,
} from '@bangle.io/extension-registry';
import { useWorkspaceContext } from '@bangle.io/workspace-context';

import { useGetEditorState } from '..';
import { Editor } from '../Editor';

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

jest.mock('@bangle.io/extension-registry', () => {
  const actual = jest.requireActual('@bangle.io/extension-registry');
  return {
    ...actual,
    useExtensionRegistryContext: jest.fn(),
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

let getNote, result: ReturnType<typeof render>;

beforeEach(() => {
  getNote = jest.fn().mockResolvedValue(generateDoc());

  (useWorkspaceContext as any).mockImplementation(() => {
    return {
      getNote,
    };
  });

  (useExtensionRegistryContext as any).mockImplementation(() => {
    return extensionRegistry;
  });
});

test('basic renders', async () => {
  let onEditorReady = jest.fn();
  act(() => {
    result = render(
      <div>
        <Editor
          editorId={1}
          onEditorReady={onEditorReady}
          wsPath="something:blah.md"
          className="test-class"
        />
      </div>,
    );
  });

  await waitFor(() => {
    expect(result.container.innerHTML).toContain('class="test-class');
  });

  expect(onEditorReady).toBeCalledTimes(1);
  expect(result!.container.innerHTML).toContain('Hello world! I am a test');
  expect(result!.container).toMatchSnapshot();
});

test('works without editorId', async () => {
  let onEditorReady = jest.fn();
  act(() => {
    result = render(
      <div>
        <Editor
          onEditorReady={onEditorReady}
          wsPath="something:blah.md"
          className="test-class"
        />
      </div>,
    );
  });

  await waitFor(() => {
    expect(result.container.innerHTML).toContain('class="test-class');
  });

  expect(onEditorReady).toBeCalledTimes(1);
  expect(result!.container.innerHTML).toContain('Hello world! I am a test');
  expect(result!.container).toMatchSnapshot();
});

test('changing of wsPath works', async () => {
  let onEditorReady = jest.fn();
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
        <Editor
          editorId={1}
          onEditorReady={onEditorReady}
          className="test-class"
          wsPath="something:one.md"
        />
      </div>,
    );
  });

  await waitFor(() => {
    expect(result.container.innerHTML).toContain('class="test-class');
  });

  expect(result!.container.innerHTML).toContain('one note');

  act(() => {
    result.rerender(
      <div>
        <Editor
          editorId={1}
          onEditorReady={onEditorReady}
          wsPath="something:two.md"
          className="test-class"
        />
      </div>,
    );
  });

  await waitFor(() => {
    expect(result.container.innerHTML).toContain('class="test-class');
  });

  expect(onEditorReady).toBeCalledTimes(2);
  expect(getNote).toBeCalledTimes(2);

  expect(result!.container.innerHTML).toContain('two note');
});

describe('useGetEditorState', () => {
  test('generates correct state', () => {
    const { result } = renderHook(() =>
      useGetEditorState({
        editorId: 0,
        extensionRegistry,
        initialValue: '',
        wsPath: 'something:one.md',
      }),
    );
    expect(result.current?.pmState.toJSON()).toMatchInlineSnapshot(`
      Object {
        "doc": Object {
          "content": Array [
            Object {
              "type": "paragraph",
            },
          ],
          "type": "doc",
        },
        "selection": Object {
          "anchor": 1,
          "head": 1,
          "type": "text",
        },
      }
    `);

    expect(result.current?.specRegistry).toBeTruthy();
  });
});
