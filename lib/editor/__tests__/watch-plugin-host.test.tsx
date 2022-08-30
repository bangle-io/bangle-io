/**
 * @jest-environment @bangle.io/jsdom-env
 */
/** @jsx psx */
/// <reference path="../../../missing-test-types.d.ts" />
/// <reference path="./missing-test-types.d.ts" />

import { defaultPlugins, defaultSpecs } from '@bangle.dev/all-base-components';
import { SpecRegistry } from '@bangle.dev/core';
import type { EditorState, EditorView } from '@bangle.dev/pm';
import { Plugin, PluginKey } from '@bangle.dev/pm';
import { psx, renderTestEditor, typeText } from '@bangle.dev/test-helpers';

import { EditorDisplayType, PRIMARY_EDITOR_INDEX } from '@bangle.io/constants';
import type { EditorWatchPluginState } from '@bangle.io/shared-types';
import { createBasicTestStore } from '@bangle.io/test-utils';

import { watchPluginHost } from '../watch-plugin-host';

const specRegistry = new SpecRegistry([...defaultSpecs()]);

let render: (plugin: any) => ReturnType<typeof renderTestEditor>;

let abortController = new AbortController();
let { store: initialBangleStore } = createBasicTestStore({});
beforeEach(() => {
  abortController = new AbortController();
  ({ store: initialBangleStore } = createBasicTestStore({}));
  jest.useFakeTimers();
  render = (plugin) =>
    renderTestEditor({
      specRegistry,
      plugins: [defaultPlugins(), plugin],
    });
});

afterEach(() => {
  abortController.abort();
  jest.useRealTimers();
});

jest.mock('@bangle.io/utils', () => {
  const actual = jest.requireActual('@bangle.io/utils');

  return {
    ...actual,
    debounceFn: jest.fn((cb, opts) => {
      const fn = jest.fn(() => {
        cb();
      });
      (fn as any).cancel = jest.fn();

      return fn;
    }),
  };
});

test('works', async () => {
  const testEditor = render(
    watchPluginHost(
      {
        dispatchSerialOperation: jest.fn(),
        editorDisplayType: EditorDisplayType.Page,
        wsPath: 'test:my-path.md',
        editorId: PRIMARY_EDITOR_INDEX,
        bangleStore: initialBangleStore,
      },
      [],
    ),
  );

  const { view } = await testEditor(
    <doc>
      <para>foo[]bar</para>
    </doc>,
  );

  typeText(view, 'hello');

  expect(view.state).toEqualDocAndSelection(
    <doc>
      <para>foohello[]bar</para>
    </doc>,
  );
});

describe('plugin state assertions', () => {
  let setup: (
    customPlugins: Plugin | Plugin[],
    watchPluginStates: EditorWatchPluginState[],
  ) => void;
  let dispatchSerialOperation = jest.fn();
  let view: EditorView;

  beforeEach(() => {
    dispatchSerialOperation = jest.fn();

    setup = async (customPlugins, watchPluginStates) => {
      const testEditor = render([
        customPlugins,
        watchPluginHost(
          {
            dispatchSerialOperation,
            editorDisplayType: EditorDisplayType.Page,
            wsPath: 'test:my-path.md',
            editorId: PRIMARY_EDITOR_INDEX,
            bangleStore: initialBangleStore,
          },
          watchPluginStates,
        ),
      ]);

      ({ view } = await testEditor(
        <doc>
          <para>foo[]bar</para>
        </doc>,
      ));
    };
  });

  test('dispatches operation on plugins state change', async () => {
    const myPluginKey = new PluginKey();
    await setup(
      new Plugin({
        key: myPluginKey,
        state: {
          init: (_: any, state: EditorState) => {
            return { counter: 0 };
          },
          apply: (tr, pluginState: any) => {
            return { counter: pluginState.counter + 1 };
          },
        },
      }),
      [
        {
          operation: 'operation::my-op:watch',
          pluginKey: myPluginKey,
        },
      ],
    );

    typeText(view, 'hello');

    jest.runOnlyPendingTimers();

    expect(dispatchSerialOperation).toBeCalledTimes(1);
    expect(dispatchSerialOperation).nthCalledWith(1, {
      name: 'operation::my-op:watch',
      value: { editorId: PRIMARY_EDITOR_INDEX },
    });

    // new updates should trigger another call
    typeText(view, 'second');
    jest.runOnlyPendingTimers();

    expect(dispatchSerialOperation).toBeCalledTimes(2);
    expect(dispatchSerialOperation).nthCalledWith(2, {
      name: 'operation::my-op:watch',
      value: { editorId: PRIMARY_EDITOR_INDEX },
    });
  });

  test('dispatches operation on when multiple plugin state changes', async () => {
    const myPlugin1Key = new PluginKey();
    const myPlugin2Key = new PluginKey();

    let stopPlugin2StateUpdates = false;

    await setup(
      [
        new Plugin({
          key: myPlugin1Key,
          state: {
            init: (_: any, state: EditorState) => {
              return { counter: 0 };
            },
            apply: (tr, pluginState: any) => {
              return { counter: pluginState.counter + 1 };
            },
          },
        }),
        new Plugin({
          key: myPlugin2Key,
          state: {
            init: (_: any, state: EditorState) => {
              return { counter: 0 };
            },
            apply: (tr, pluginState: any) => {
              if (stopPlugin2StateUpdates) {
                return pluginState;
              }

              return { counter: pluginState.counter + 1 };
            },
          },
        }),
      ],
      [
        {
          operation: 'operation::plugin-1:watch',
          pluginKey: myPlugin1Key,
        },
        {
          operation: 'operation::plugin-2:watch',
          pluginKey: myPlugin2Key,
        },
      ],
    );

    typeText(view, 'hello');

    jest.runOnlyPendingTimers();

    expect(dispatchSerialOperation).toBeCalledTimes(2);
    expect(dispatchSerialOperation).nthCalledWith(1, {
      name: 'operation::plugin-1:watch',
      value: { editorId: PRIMARY_EDITOR_INDEX },
    });
    expect(dispatchSerialOperation).nthCalledWith(2, {
      name: 'operation::plugin-2:watch',
      value: { editorId: PRIMARY_EDITOR_INDEX },
    });

    stopPlugin2StateUpdates = true;

    // new updates now should only trigger plugin 1 operation
    typeText(view, 'second');
    jest.runOnlyPendingTimers();

    expect(dispatchSerialOperation).toBeCalledTimes(3);
    expect(dispatchSerialOperation).nthCalledWith(3, {
      name: 'operation::plugin-1:watch',
      value: { editorId: PRIMARY_EDITOR_INDEX },
    });
  });
});
