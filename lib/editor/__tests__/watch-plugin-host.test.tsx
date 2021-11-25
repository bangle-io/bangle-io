/**
 * @jest-environment jsdom
 */
/** @jsx psx */
/// <reference path="../../../missing-test-types.d.ts" />
/// <reference path="./missing-test-types.d.ts" />

import { defaultPlugins, defaultSpecs } from '@bangle.dev/all-base-components';
import { SpecRegistry } from '@bangle.dev/core';
import type { EditorState } from '@bangle.dev/pm';
import { Plugin, PluginKey } from '@bangle.dev/pm';
import { psx, renderTestEditor, typeText } from '@bangle.dev/test-helpers';

import { EditorDisplayType } from '@bangle.io/constants';
import type { EditorWatchPluginState } from '@bangle.io/shared-types';

import { watchPluginHost } from '../watch-plugin-host';

const specRegistry = new SpecRegistry([...defaultSpecs()]);

let render: (plugin: any) => ReturnType<typeof renderTestEditor>;

beforeEach(() => {
  jest.useFakeTimers();
  render = (plugin) =>
    renderTestEditor({
      specRegistry,
      plugins: [defaultPlugins(), plugin],
    });
});

afterEach(() => {
  jest.useRealTimers();
});

test('works', async () => {
  const testEditor = render(
    watchPluginHost(
      {
        dispatchAction: jest.fn(),
        editorDisplayType: EditorDisplayType.Page,
        wsPath: 'test:my-path.md',
        editorId: 0,
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
  let dispatchAction, view;

  beforeEach(() => {
    dispatchAction = jest.fn();

    setup = async (customPlugins, watchPluginStates) => {
      const testEditor = render([
        customPlugins,
        watchPluginHost(
          {
            dispatchAction,
            editorDisplayType: EditorDisplayType.Page,
            wsPath: 'test:my-path.md',
            editorId: 0,
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

  test('dispatches action on plugins state change', async () => {
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
          action: 'action::my-action:watch',
          pluginKey: myPluginKey,
        },
      ],
    );

    typeText(view, 'hello');

    jest.runOnlyPendingTimers();

    expect(dispatchAction).toBeCalledTimes(1);
    expect(dispatchAction).nthCalledWith(1, {
      name: 'action::my-action:watch',
      value: { editorId: 0 },
    });

    // new updates should trigger another call
    typeText(view, 'second');
    jest.runOnlyPendingTimers();

    expect(dispatchAction).toBeCalledTimes(2);
    expect(dispatchAction).nthCalledWith(2, {
      name: 'action::my-action:watch',
      value: { editorId: 0 },
    });
  });

  test('dispatches action on when multiple plugin state changes', async () => {
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
          action: 'action::plugin-1:watch',
          pluginKey: myPlugin1Key,
        },
        {
          action: 'action::plugin-2:watch',
          pluginKey: myPlugin2Key,
        },
      ],
    );

    typeText(view, 'hello');

    jest.runOnlyPendingTimers();

    expect(dispatchAction).toBeCalledTimes(2);
    expect(dispatchAction).nthCalledWith(1, {
      name: 'action::plugin-1:watch',
      value: { editorId: 0 },
    });
    expect(dispatchAction).nthCalledWith(2, {
      name: 'action::plugin-2:watch',
      value: { editorId: 0 },
    });

    stopPlugin2StateUpdates = true;

    // new updates now should only trigger plugin 1 actions
    typeText(view, 'second');
    jest.runOnlyPendingTimers();

    expect(dispatchAction).toBeCalledTimes(3);
    expect(dispatchAction).nthCalledWith(3, {
      name: 'action::plugin-1:watch',
      value: { editorId: 0 },
    });
  });
});
