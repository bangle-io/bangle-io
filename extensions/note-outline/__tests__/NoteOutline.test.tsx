import { act, render } from '@testing-library/react';
import React from 'react';

import { useActionHandler } from '@bangle.io/action-context';
import { useEditorManagerContext } from '@bangle.io/editor-manager-context';
import type { ActionHandler } from '@bangle.io/shared-types';
import { createEditorFromMd } from '@bangle.io/test-utils/create-editor-view';
import {
  getUseEditorManagerContextReturn,
  getUseWorkspaceContextReturn,
} from '@bangle.io/test-utils/function-mock-return';
import { getEditorIntersectionObserverPluginState } from '@bangle.io/utils';
import { useWorkspaceContext } from '@bangle.io/workspace-context';

import noteOutlineExtension from '..';
import { WATCH_HEADINGS_PLUGIN_STATE_UPDATE_ACTION } from '../config';
import { NoteOutline } from '../NoteOutline';

jest.mock('@bangle.io/workspace-context');
jest.mock('@bangle.io/action-context');
jest.mock('@bangle.io/editor-manager-context');

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

let useActionHandlerMock = useActionHandler as jest.MockedFunction<
  typeof useActionHandler
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

  useActionHandlerMock.mockImplementation((cb) => {});

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
          <span
            class="font-light"
          >
            &lt;No headings found&gt;
          </span>
        </div>
      </div>
    </div>
  `);
});

describe('with editor', () => {
  let editor;
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
    useEditorManagerContextMock.mockImplementation(() => {
      return {
        ...getUseEditorManagerContextReturn,
        focusedEditorId: 0,
        getEditor: jest.fn(() => editor),
        getEditorState: jest.fn(() => editor.view.state),
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
              class="note-outline_first-node-in-viewport ui-bangle-button_button p-1  transition-all duration-100 focus:outline-none focus:ring focus:border-blue-300"
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
              class="ui-bangle-button_button p-1  transition-all duration-100 is-quiet focus:outline-none focus:ring focus:border-blue-300"
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
    useEditorManagerContextMock.mockImplementation(() => {
      return {
        ...getUseEditorManagerContextReturn,
        focusedEditorId: undefined,
        getEditor: jest.fn(() => editor),
        getEditorState: jest.fn(() => editor.view.state),
      };
    });
    const renderResult = render(
      <div>
        <NoteOutline />
      </div>,
    );

    expect(renderResult.container.innerHTML).toContain('No headings found');
  });

  describe('actions', () => {
    let dispatchActionCb: ActionHandler | undefined;
    let getEditorState;
    beforeEach(() => {
      dispatchActionCb = undefined;
      getEditorState = jest.fn(() => editor.view.state);
      useActionHandlerMock.mockImplementation((cb) => {
        dispatchActionCb = cb;
      });
    });

    test('updates on action handler dispatch', () => {
      useEditorManagerContextMock.mockImplementation(() => {
        return {
          ...getUseEditorManagerContextReturn,
          focusedEditorId: 0,
          getEditor: jest.fn(() => editor),
          getEditorState: getEditorState,
        };
      });
      render(
        <div>
          <NoteOutline />
        </div>,
      );

      expect(getEditorState).toBeCalledTimes(1);

      act(() => {
        dispatchActionCb?.({
          name: WATCH_HEADINGS_PLUGIN_STATE_UPDATE_ACTION,
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
          getEditor: jest.fn(() => editor),
          getEditorState: getEditorState,
        };
      });
      render(
        <div>
          <NoteOutline />
        </div>,
      );

      expect(getEditorState).toBeCalledTimes(1);

      act(() => {
        dispatchActionCb?.({
          name: WATCH_HEADINGS_PLUGIN_STATE_UPDATE_ACTION,
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
          getEditor: jest.fn(() => editor),
          getEditorState: getEditorState,
        };
      });
      render(
        <div>
          <NoteOutline />
        </div>,
      );

      expect(getEditorState).toBeCalledTimes(1);

      act(() => {
        dispatchActionCb?.({
          name: 'action::random',
          value: {
            editorId: 1,
          },
        });
      });
      expect(getEditorState).toBeCalledTimes(1);
    });
  });
});
