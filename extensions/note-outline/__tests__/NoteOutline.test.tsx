/**
 * @jest-environment jsdom
 */
import { act, render } from '@testing-library/react';
import React from 'react';

import { useSerialOperationHandler } from '@bangle.io/api';
import type { DispatchSerialOperationType } from '@bangle.io/shared-types';
import {
  getEditor,
  getEditorState,
  useEditorManagerContext,
} from '@bangle.io/slice-editor-manager';
import { useWorkspaceContext } from '@bangle.io/slice-workspace';
import {
  createEditorFromMd,
  getUseEditorManagerContextReturn,
  getUseWorkspaceContextReturn,
} from '@bangle.io/test-utils';
import { getEditorIntersectionObserverPluginState } from '@bangle.io/utils';

import noteOutlineExtension from '..';
import { WATCH_HEADINGS_PLUGIN_STATE_UPDATE_OP } from '../config';
import { NoteOutline } from '../NoteOutline';

jest.mock('@bangle.io/slice-workspace');
jest.mock('@bangle.io/api');
jest.mock('@bangle.io/slice-editor-manager', () => {
  return {
    useEditorManagerContext: jest.fn(),
    getEditor: jest.fn(),
    getEditorState: jest.fn(),
  };
});

jest.mock('@bangle.io/utils', () => {
  const utils = jest.requireActual('@bangle.io/utils');

  return {
    ...utils,
    getEditorIntersectionObserverPluginState: jest.fn(),
  };
});

let useWorkspaceContextMock = useWorkspaceContext as jest.MockedFunction<
  typeof useWorkspaceContext
>;

let useEditorManagerContextMock =
  useEditorManagerContext as jest.MockedFunction<
    typeof useEditorManagerContext
  >;

let useSerialOperationHandlerMock =
  useSerialOperationHandler as jest.MockedFunction<
    typeof useSerialOperationHandler
  >;

let getEditorIntersectionObserverPluginStateMock =
  getEditorIntersectionObserverPluginState as jest.MockedFunction<
    typeof getEditorIntersectionObserverPluginState
  >;

beforeEach(() => {
  useWorkspaceContextMock.mockImplementation(() => {
    return {
      ...getUseWorkspaceContextReturn,
    };
  });
  useEditorManagerContextMock.mockImplementation(() => {
    return {
      ...getUseEditorManagerContextReturn,
    };
  });

  useSerialOperationHandlerMock.mockImplementation((cb) => {});

  getEditorIntersectionObserverPluginStateMock.mockImplementation(() => {
    return {
      minStartPosition: 0,
      maxStartPosition: 0,
    };
  });
});

test('renders when no headings found', async () => {
  const renderResult = render(
    <div>
      <NoteOutline />
    </div>,
  );

  expect(renderResult.container).toMatchInlineSnapshot(`
    <div>
      <div>
        <div
          class="note-outline_container flex flex-col"
        >
          <span>
            🐒 No headings found!
            <br />
            <span
              class="font-light"
            >
              Create heading by typing # followed by a space.
            </span>
          </span>
        </div>
      </div>
    </div>
  `);
});

describe('with editor', () => {
  let editor: ReturnType<typeof createEditorFromMd>;
  beforeEach(() => {
    editor = createEditorFromMd(
      `
# hello 1

para 1

## hello 2 

para 2
    `,
      {
        extensions: [noteOutlineExtension],
      },
    );
  });

  test('renders headings when focused with editor', () => {
    (getEditorState as any).mockImplementation(() => () => editor.view.state);
    (getEditor as any).mockImplementation(() => () => editor);

    useEditorManagerContextMock.mockImplementation(() => {
      return {
        ...getUseEditorManagerContextReturn,
        focusedEditorId: 0,
      };
    });
    const renderResult = render(
      <div>
        <NoteOutline />
      </div>,
    );

    const [button1, button2] = Array.from(
      renderResult.container.querySelectorAll('button'),
    );

    expect(button1?.innerHTML).toContain('hello 1');
    expect(button1?.style.paddingLeft).toBe('0px');
    expect(button2?.innerHTML).toContain('hello 2');
    expect(button2?.style.paddingLeft).toBe('12px');

    expect(renderResult.container).toMatchInlineSnapshot(`
      <div>
        <div>
          <div
            class="note-outline_container flex flex-col"
          >
            <button
              aria-label="hello 1"
              class="note-outline_first-node-in-viewport B-ui-bangle-button_button p-1  transition-all duration-100"
              style="padding-left: 0px; padding-top: 4px; padding-bottom: 4px;"
              type="button"
            >
              <span
                class="text-sm truncate"
              >
                hello 1
              </span>
            </button>
            <button
              aria-label="hello 2"
              class="B-ui-bangle-button_button p-1  transition-all duration-100 is-quiet"
              style="padding-left: 12px; padding-top: 4px; padding-bottom: 4px;"
              type="button"
            >
              <span
                class="text-sm truncate"
              >
                hello 2
              </span>
            </button>
          </div>
        </div>
      </div>
    `);
  });

  test('renders headings when no focused editor', () => {
    (getEditorState as any).mockImplementation(() => () => editor.view.state);
    (getEditor as any).mockImplementation(() => () => editor);
    useEditorManagerContextMock.mockImplementation(() => {
      return {
        ...getUseEditorManagerContextReturn,
        focusedEditorId: undefined,
      };
    });
    const renderResult = render(
      <div>
        <NoteOutline />
      </div>,
    );

    expect(renderResult.container.innerHTML).toContain('No headings found');
  });

  describe('operations', () => {
    let dispatchSOpCb: DispatchSerialOperationType | undefined;

    beforeEach(() => {
      dispatchSOpCb = undefined;
      jest
        .mocked(getEditorState)
        .mockImplementation(() => () => editor.view.state);
      jest.mocked(getEditor).mockImplementation(() => () => editor);
      useSerialOperationHandlerMock.mockImplementation((cb) => {
        dispatchSOpCb = cb;
      });
    });

    test('updates on operation handler dispatch', () => {
      useEditorManagerContextMock.mockImplementation(() => {
        return {
          ...getUseEditorManagerContextReturn,
          focusedEditorId: 0,
        };
      });
      render(
        <div>
          <NoteOutline />
        </div>,
      );

      expect(getEditorState).toBeCalledTimes(1);

      act(() => {
        dispatchSOpCb?.({
          name: WATCH_HEADINGS_PLUGIN_STATE_UPDATE_OP,
          value: {
            editorId: 0,
          },
        });
      });
      expect(getEditorState).toBeCalledTimes(2);
    });

    test('does not update when editorId donot match', () => {
      useEditorManagerContextMock.mockImplementation(() => {
        return {
          ...getUseEditorManagerContextReturn,
          focusedEditorId: 0,
        };
      });
      render(
        <div>
          <NoteOutline />
        </div>,
      );

      expect(getEditorState).toBeCalledTimes(1);

      act(() => {
        dispatchSOpCb?.({
          name: WATCH_HEADINGS_PLUGIN_STATE_UPDATE_OP,
          value: {
            editorId: 1,
          },
        });
      });
      expect(getEditorState).toBeCalledTimes(1);
    });

    test('does not update for any other action', () => {
      useEditorManagerContextMock.mockImplementation(() => {
        return {
          ...getUseEditorManagerContextReturn,
          focusedEditorId: 0,
        };
      });
      render(
        <div>
          <NoteOutline />
        </div>,
      );

      expect(getEditorState).toBeCalledTimes(1);

      act(() => {
        dispatchSOpCb?.({
          name: 'operation::random',
          value: {
            editorId: 1,
          },
        });
      });
      expect(getEditorState).toBeCalledTimes(1);
    });
  });
});
