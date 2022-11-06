/**
 * @jest-environment @bangle.io/jsdom-env
 */
import { act, render, waitFor } from '@testing-library/react';
import { renderHook } from '@testing-library/react-hooks';
import React from 'react';

import { Selection } from '@bangle.dev/pm';

import {
  EditorDisplayType,
  PRIMARY_EDITOR_INDEX,
  SECONDARY_EDITOR_INDEX,
} from '@bangle.io/constants';
import type { EditorIdType } from '@bangle.io/slice-editor-manager';
import { getEditor, getEditorView } from '@bangle.io/slice-editor-manager';
import {
  createBasicTestStore,
  createExtensionRegistry,
  createPMNode,
  setupMockWorkspaceWithNotes,
  TestStoreProvider,
} from '@bangle.io/test-utils';

import { Editor, useGetEditorState } from '../Editor';

const extensionRegistry = createExtensionRegistry([], {
  editorCore: true,
});

let result: ReturnType<typeof render>;

const ONE_DOC_CONTENT = `Hello world! I am a test`;
const TWO_DOC_CONTENT = `bubble gum`;
const wsName = 'test-ws';

beforeEach(() => {
  jest.useRealTimers();
});

const setup = async () => {
  const noteWsPaths: Array<[string, string]> = [
    [`${wsName}:one.md`, ONE_DOC_CONTENT],
    [`${wsName}:two.md`, TWO_DOC_CONTENT],
  ];

  const { store } = createBasicTestStore({
    useEditorManagerSlice: true,
    useUISlice: true,
  });
  await setupMockWorkspaceWithNotes(store, wsName, noteWsPaths);

  return { store };
};

test('basic renders', async () => {
  const { store: bangleStore } = await setup();

  await act(async () => {
    result = render(
      <TestStoreProvider bangleStore={bangleStore} bangleStoreChanged={0}>
        <Editor
          editorId={SECONDARY_EDITOR_INDEX}
          wsPath="test-ws:one.md"
          className="test-class"
          extensionRegistry={extensionRegistry}
        />
      </TestStoreProvider>,
    );
  });

  await waitFor(() => {
    expect(result!.container.innerHTML).toContain(ONE_DOC_CONTENT);
  });

  await waitFor(() => {
    expect(result.container.innerHTML).toContain('class="test-class');
  });

  expect(result!.container.innerHTML).toContain(ONE_DOC_CONTENT);
  expect(result!.container).toMatchSnapshot();
});

test('persists editor selection', async () => {
  const setSelectionAtEnd = (editorId: EditorIdType) => {
    const view = getEditorView(editorId)(bangleStore.state)!;
    view.dispatch(view.state.tr.setSelection(Selection.atEnd(view.state.doc)));
  };

  const getEditorSelection = (editorId: EditorIdType) => {
    const view = getEditorView(editorId)(bangleStore.state)!;

    return view.state.selection.toJSON();
  };

  const { store: bangleStore } = await setup();

  await act(async () => {
    result = render(
      <TestStoreProvider bangleStore={bangleStore} bangleStoreChanged={0}>
        <Editor
          editorId={SECONDARY_EDITOR_INDEX}
          wsPath="test-ws:one.md"
          className="test-class1"
          extensionRegistry={extensionRegistry}
        />
      </TestStoreProvider>,
    );
  });

  await waitFor(() => {
    expect(result!.container.innerHTML).toContain(ONE_DOC_CONTENT);
  });

  expect(getEditorSelection(SECONDARY_EDITOR_INDEX)).toEqual({
    anchor: 1,
    head: 1,
    type: 'text',
  });

  // change the selection so we can test if selection is persisted
  // if we open the document again.
  setSelectionAtEnd(SECONDARY_EDITOR_INDEX);

  const expectedSelection = {
    anchor: 25,
    head: 25,
    type: 'text',
  };
  expect(getEditorSelection(SECONDARY_EDITOR_INDEX)).toEqual(expectedSelection);

  // load another document
  act(() => {
    result.rerender(
      <TestStoreProvider bangleStore={bangleStore} bangleStoreChanged={0}>
        <Editor
          editorId={SECONDARY_EDITOR_INDEX}
          wsPath="test-ws:two.md"
          className="test-class2"
          extensionRegistry={extensionRegistry}
        />
      </TestStoreProvider>,
    );
  });

  await waitFor(() => {
    expect(result!.container.innerHTML).toContain(TWO_DOC_CONTENT);
  });
  // The new editor should not use the selection from one.md
  expect(getEditorSelection(SECONDARY_EDITOR_INDEX)).toEqual({
    anchor: 1,
    head: 1,
    type: 'text',
  });

  // now load the one.md document again, this time the selection
  // should be hydrated with `expectedSelection`
  act(() => {
    result = render(
      <TestStoreProvider bangleStore={bangleStore} bangleStoreChanged={0}>
        <Editor
          editorId={SECONDARY_EDITOR_INDEX}
          wsPath="test-ws:one.md"
          className="test-class1"
          extensionRegistry={extensionRegistry}
        />
      </TestStoreProvider>,
    );
  });

  await waitFor(() => {
    expect(result!.container.innerHTML).toContain(ONE_DOC_CONTENT);
  });

  expect(getEditorSelection(SECONDARY_EDITOR_INDEX)).toEqual(expectedSelection);
});

test('mounting and unmounting set state correctly in editor slice', async () => {
  const { store: bangleStore } = await setup();

  await act(async () => {
    result = render(
      <TestStoreProvider bangleStore={bangleStore} bangleStoreChanged={0}>
        <Editor
          editorId={SECONDARY_EDITOR_INDEX}
          wsPath="test-ws:one.md"
          className="test-class"
          extensionRegistry={extensionRegistry}
        />
      </TestStoreProvider>,
    );
  });

  await waitFor(() => {
    expect(result!.container.innerHTML).toContain(ONE_DOC_CONTENT);
  });
  await waitFor(() => {
    expect(result.container.innerHTML).toContain('class="test-class');
  });

  expect(getEditor(PRIMARY_EDITOR_INDEX)(bangleStore.state)).toBeUndefined();
  expect(getEditor(SECONDARY_EDITOR_INDEX)(bangleStore.state)).toBeDefined();

  result.unmount();

  expect(getEditor(PRIMARY_EDITOR_INDEX)(bangleStore.state)).toBeUndefined();
  expect(getEditor(SECONDARY_EDITOR_INDEX)(bangleStore.state)).toBeUndefined();
});

test('revokes editor proxy', async () => {
  const { store: bangleStore } = await setup();

  let revokeSpy = jest.fn();
  let spy = jest
    .spyOn(global.Proxy, 'revocable')
    .mockImplementation((r) => ({ proxy: r, revoke: revokeSpy }));

  await act(async () => {
    result = render(
      <TestStoreProvider bangleStore={bangleStore} bangleStoreChanged={0}>
        <Editor
          editorId={SECONDARY_EDITOR_INDEX}
          wsPath="test-ws:one.md"
          className="test-class"
          extensionRegistry={extensionRegistry}
        />
      </TestStoreProvider>,
    );
  });

  await waitFor(() => {
    expect(result!.container.innerHTML).toContain(ONE_DOC_CONTENT);
  });

  await waitFor(() => {
    expect(result.container.innerHTML).toContain('class="test-class');
  });

  jest.useFakeTimers();

  act(() => {
    result.unmount();
  });

  jest.runAllTimers();

  expect(spy).toBeCalledTimes(1);

  expect(revokeSpy).toBeCalledTimes(1);
});

test('changing of wsPath works', async () => {
  const { store: bangleStore } = await setup();

  await act(async () => {
    result = render(
      <TestStoreProvider bangleStore={bangleStore} bangleStoreChanged={0}>
        <Editor
          editorId={SECONDARY_EDITOR_INDEX}
          className="test-class"
          wsPath="test-ws:one.md"
          extensionRegistry={extensionRegistry}
        />
      </TestStoreProvider>,
    );
  });

  await waitFor(() => {
    expect(result!.container.innerHTML).toContain(ONE_DOC_CONTENT);
  });

  await waitFor(() => {
    expect(result.container.innerHTML).toContain('class="test-class');
  });

  expect(result!.container.innerHTML).toContain(ONE_DOC_CONTENT);

  await act(async () => {
    result.rerender(
      <TestStoreProvider bangleStore={bangleStore} bangleStoreChanged={0}>
        <Editor
          editorId={SECONDARY_EDITOR_INDEX}
          wsPath="test-ws:two.md"
          className="test-class"
          extensionRegistry={extensionRegistry}
        />
      </TestStoreProvider>,
    );
  });

  await waitFor(() => {
    expect(result.container.innerHTML).toContain('class="test-class');
  });

  expect(result!.container.innerHTML).toContain(TWO_DOC_CONTENT);
});

describe('useGetEditorState', () => {
  test('generates correct state', async () => {
    const { store: bangleStore } = await setup();

    const { result } = renderHook(() =>
      useGetEditorState({
        editorId: PRIMARY_EDITOR_INDEX,
        extensionRegistry,
        initialValue: '',
        wsPath: 'something:one.md',
        editorDisplayType: EditorDisplayType.Page,
        dispatchSerialOperation: jest.fn(),
        bangleStore: bangleStore,
        initialSelection: undefined,
      }),
    );

    expect(result.current.pmState.toJSON()).toMatchInlineSnapshot(`
      {
        "doc": {
          "content": [
            {
              "type": "paragraph",
            },
          ],
          "type": "doc",
        },
        "selection": {
          "anchor": 1,
          "head": 1,
          "type": "text",
        },
      }
    `);
    expect(result.current.specRegistry).toBeTruthy();
  });

  test('when initial selection is provided', async () => {
    const pmNode = createPMNode([], `# Hello World`.trim());
    const { store: bangleStore } = await setup();

    const { result } = renderHook(() =>
      useGetEditorState({
        editorId: PRIMARY_EDITOR_INDEX,
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

    expect(result.current.pmState.toJSON().selection).toEqual({
      anchor: 5,
      head: 5,
      type: 'text',
    });

    expect(result.current.pmState.toJSON()).toMatchInlineSnapshot(`
      {
        "doc": {
          "content": [
            {
              "attrs": {
                "collapseContent": null,
                "level": 1,
              },
              "content": [
                {
                  "text": "Hello World",
                  "type": "text",
                },
              ],
              "type": "heading",
            },
          ],
          "type": "doc",
        },
        "selection": {
          "anchor": 5,
          "head": 5,
          "type": "text",
        },
      }
    `);
    expect(result.current.specRegistry).toBeTruthy();
  });
});
