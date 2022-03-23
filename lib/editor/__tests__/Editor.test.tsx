/**
 * @jest-environment jsdom
 */
import { act, render, waitFor } from '@testing-library/react';
import { renderHook } from '@testing-library/react-hooks';
import React from 'react';

import { BangleEditor } from '@bangle.dev/core';
import { Node, Selection } from '@bangle.dev/pm';

import { EditorDisplayType } from '@bangle.io/constants';
import { getInitialSelection } from '@bangle.io/slice-editor-manager';
import {
  createBasicTestStore,
  createExtensionRegistry,
  createPMNode,
} from '@bangle.io/test-utils';

import { Editor, useGetEditorState } from '../Editor';

const extensionRegistry = createExtensionRegistry([], {
  editorCore: true,
});

jest.mock('@bangle.io/slice-editor-manager', () => {
  const actual = jest.requireActual('@bangle.io/slice-editor-manager');

  return {
    ...actual,
    getInitialSelection: jest.fn(() => () => {}),
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

let getNoteMock = jest.fn().mockImplementation(async () => testDocNode);

let result: ReturnType<typeof render>;

const testDocNode = generateDoc();
let { store: bangleStore } = createBasicTestStore({});

let dispatchSerialOperation = jest.fn();
beforeEach(() => {
  ({ store: bangleStore } = createBasicTestStore({}));
});

test('basic renders', async () => {
  act(() => {
    result = render(
      <div>
        <Editor
          editorId={1}
          wsPath="something:blah.md"
          className="test-class"
          bangleStore={bangleStore}
          getDocument={getNoteMock}
          dispatchSerialOperation={dispatchSerialOperation}
          extensionRegistry={extensionRegistry}
        />
      </div>,
    );
  });

  await waitFor(() => {
    expect(result.container.innerHTML).toContain('class="test-class');
  });

  expect(result!.container.innerHTML).toContain('Hello world! I am a test');
  expect(result!.container).toMatchSnapshot();
});

test('calls getInitialSelection correctly', async () => {
  act(() => {
    result = render(
      <div>
        <Editor
          editorId={1}
          wsPath="something:blah.md"
          className="test-class"
          bangleStore={bangleStore}
          getDocument={getNoteMock}
          dispatchSerialOperation={dispatchSerialOperation}
          extensionRegistry={extensionRegistry}
        />
      </div>,
    );
  });

  await waitFor(() => {
    expect(result.container.innerHTML).toContain('class="test-class');
  });

  expect(getInitialSelection).toBeCalledTimes(1);
  expect(getInitialSelection).nthCalledWith(
    1,
    1,
    'something:blah.md',
    testDocNode,
  );
});

test('mounting unmounting calls setEditorUnmounted', async () => {
  let onEditorReady = jest.fn();
  let onEditorUnmount = jest.fn();
  act(() => {
    result = render(
      <div>
        <Editor
          editorId={1}
          wsPath="something:blah.md"
          className="test-class"
          bangleStore={bangleStore}
          getDocument={getNoteMock}
          dispatchSerialOperation={dispatchSerialOperation}
          extensionRegistry={extensionRegistry}
          onEditorReady={onEditorReady}
          onEditorUnmount={onEditorUnmount}
        />
      </div>,
    );
  });

  await waitFor(() => {
    expect(result.container.innerHTML).toContain('class="test-class');
  });

  expect(onEditorReady).toBeCalledTimes(1);
  expect(onEditorReady).nthCalledWith(1, expect.any(BangleEditor), 1);

  expect(onEditorUnmount).toBeCalledTimes(0);

  result.unmount();

  expect(onEditorReady).toBeCalledTimes(1);
  expect(onEditorUnmount).toBeCalledTimes(1);
  expect(onEditorUnmount).nthCalledWith(1, expect.any(BangleEditor), 1);
});

test('works without editorId', async () => {
  act(() => {
    result = render(
      <div>
        <Editor
          wsPath="something:blah.md"
          className="test-class"
          dispatchSerialOperation={dispatchSerialOperation}
          extensionRegistry={extensionRegistry}
          bangleStore={bangleStore}
          getDocument={getNoteMock}
        />
      </div>,
    );
  });

  await waitFor(() => {
    expect(result.container.innerHTML).toContain('class="test-class');
  });

  expect(result!.container.innerHTML).toContain('Hello world! I am a test');
  expect(result!.container).toMatchSnapshot();
});

test('revokes editor proxy', async () => {
  let onEditorReady = jest.fn();
  let onEditorUnmount = jest.fn();
  jest.useFakeTimers();

  let revokeSpy = jest.fn();
  let spy = jest
    .spyOn(global.Proxy, 'revocable')
    .mockImplementation((r) => ({ proxy: r, revoke: revokeSpy }));

  act(() => {
    result = render(
      <div>
        <Editor
          editorId={1}
          wsPath="something:blah.md"
          className="test-class"
          bangleStore={bangleStore}
          getDocument={getNoteMock}
          dispatchSerialOperation={dispatchSerialOperation}
          extensionRegistry={extensionRegistry}
          onEditorReady={onEditorReady}
          onEditorUnmount={onEditorUnmount}
        />
      </div>,
    );
  });

  await waitFor(() => {
    expect(result.container.innerHTML).toContain('class="test-class');
  });

  act(() => {
    result.unmount();
  });

  jest.runAllTimers();

  expect(spy).toBeCalledTimes(1);

  expect(revokeSpy).toBeCalledTimes(1);
});

test('changing of wsPath works', async () => {
  getNoteMock.mockImplementation(async (wsPath) => {
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
          className="test-class"
          wsPath="something:one.md"
          dispatchSerialOperation={dispatchSerialOperation}
          extensionRegistry={extensionRegistry}
          bangleStore={bangleStore}
          getDocument={getNoteMock}
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
          wsPath="something:two.md"
          className="test-class"
          dispatchSerialOperation={dispatchSerialOperation}
          extensionRegistry={extensionRegistry}
          bangleStore={bangleStore}
          getDocument={getNoteMock}
        />
      </div>,
    );
  });

  await waitFor(() => {
    expect(result.container.innerHTML).toContain('class="test-class');
  });

  expect(getNoteMock).toBeCalledTimes(2);

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
        editorDisplayType: EditorDisplayType.Page,
        dispatchSerialOperation: jest.fn(),
        bangleStore: bangleStore,
        initialSelection: undefined,
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

  test('when initial selection is provided', () => {
    const pmNode = createPMNode([], `# Hello World`.trim());

    const { result } = renderHook(() =>
      useGetEditorState({
        editorId: 0,
        extensionRegistry,
        initialValue: pmNode,
        wsPath: 'something:one.md',
        editorDisplayType: EditorDisplayType.Page,
        dispatchSerialOperation: jest.fn(),
        bangleStore: bangleStore,
        initialSelection: Selection.fromJSON(pmNode, {
          anchor: 5,
          head: 5,
          type: 'text',
        }),
      }),
    );

    expect(result.current?.pmState.toJSON().selection).toEqual({
      anchor: 5,
      head: 5,
      type: 'text',
    });

    expect(result.current?.pmState.toJSON()).toMatchInlineSnapshot(`
      Object {
        "doc": Object {
          "content": Array [
            Object {
              "attrs": Object {
                "collapseContent": null,
                "level": 1,
              },
              "content": Array [
                Object {
                  "text": "Hello World",
                  "type": "text",
                },
              ],
              "type": "heading",
            },
          ],
          "type": "doc",
        },
        "selection": Object {
          "anchor": 5,
          "head": 5,
          "type": "text",
        },
      }
    `);
    expect(result.current?.specRegistry).toBeTruthy();
  });
});
