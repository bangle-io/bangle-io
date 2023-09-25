/**
 * @jest-environment @bangle.io/jsdom-env
 */
/** @jsx psx */
/// <reference path="../../../missing-test-types.d.ts" />
/// <reference path="./missing-test-types.d.ts" />

import { psx } from '@bangle.dev/test-helpers';
import { testEditor, setupTestExtension } from '@bangle.io/test-utils-2';
import type { Node } from '@bangle.dev/pm';

import noteTags from '../index';
import { _listTags, listAllTags } from '../search';
import { createWsPath } from '@bangle.io/ws-path';

let abortController = new AbortController();

beforeEach(() => {
  abortController = new AbortController();
});

afterEach(async () => {
  abortController.abort();
});

function setup() {
  const ctx = setupTestExtension({
    extensions: [noteTags],
    abortSignal: abortController.signal,
    editor: true,
  });

  const { renderDoc } = testEditor(ctx.eternalVars);

  return {
    renderDoc,
  };
}

describe('search tag in a doc', () => {
  test('works', () => {
    const { renderDoc } = setup();

    const { view } = renderDoc(
      <doc>
        <para>
          Hello <tag tagValue="hi" />
        </para>
      </doc>,
    );

    expect([..._listTags(view.state.doc)]).toEqual(['hi']);
  });

  test('two same tag', async () => {
    const { renderDoc } = setup();

    const { view } = renderDoc(
      <doc>
        <para>
          <tag tagValue="hi" /> Hello <tag tagValue="hi" />
        </para>
      </doc>,
    );

    expect([..._listTags(view.state.doc)]).toEqual(['hi']);
  });

  test('many tags same tag', async () => {
    const { renderDoc } = setup();

    const { view } = renderDoc(
      <doc>
        <para>
          <tag tagValue="hi" /> Hello <tag tagValue="hi2" />
        </para>
        <heading>
          <tag tagValue="bye" /> Hello <tag tagValue="bye2" />
        </heading>
      </doc>,
    );

    expect([..._listTags(view.state.doc)]).toEqual([
      'hi',
      'hi2',
      'bye',
      'bye2',
    ]);
  });
});

describe('search tag across wsPaths', () => {
  test('works', async () => {
    const { renderDoc } = setup();
    const { view: view1 } = renderDoc(
      <doc>
        <para>
          Hello <tag tagValue="hi" />
        </para>
      </doc>,
    );

    const { view: view2 } = renderDoc(
      <doc>
        <para>
          Hello <tag tagValue="second" /> <tag tagValue="third" />
        </para>
      </doc>,
    );

    const { view: view3 } = renderDoc(
      <doc>
        <heading>
          Hello <tag tagValue="fourth" /> brah <tag tagValue="fifth" />
        </heading>
      </doc>,
    );

    const controller = new AbortController();
    const signal = controller.signal;
    const callback = jest.fn(async (wsPath) => {
      if (wsPath === 't:1') {
        return view1.state.doc;
      }
      if (wsPath === 't:2') {
        return view2.state.doc;
      }
      if (wsPath === 't:3') {
        return view3.state.doc;
      }
      throw new Error('Unknown wsPath ' + wsPath);
    });

    const tagsSet = await listAllTags(
      ['t:1', 't:2', 't:3'].map((t) => createWsPath(t)),
      callback,
      signal,
    );

    expect(tagsSet).toEqual(['hi', 'second', 'third', 'fourth', 'fifth']);
    expect(callback).toBeCalledTimes(3);
  });

  test('aborts correctly', async () => {
    const { renderDoc } = setup();

    const { view: view1 } = renderDoc(
      <doc>
        <para>
          Hello <tag tagValue="hi" />
        </para>
      </doc>,
    );

    const { view: view2 } = renderDoc(
      <doc>
        <para>
          Hello <tag tagValue="second" /> <tag tagValue="third" />
        </para>
      </doc>,
    );

    const { view: view3 } = renderDoc(
      <doc>
        <heading>
          Hello <tag tagValue="fourth" /> brah <tag tagValue="fifth" />
        </heading>
      </doc>,
    );

    const controller = new AbortController();
    const signal = controller.signal;

    const callback = jest.fn(async (wsPath): Promise<Node> => {
      if (wsPath === 't:1') {
        return view1.state.doc;
      }
      if (wsPath === 't:2') {
        controller.abort();

        return new Promise((res) => setTimeout(res, 0)).then(() => {
          return view2.state.doc;
        });
      }
      if (wsPath === 't:3') {
        return view3.state.doc;
      }
      throw new Error('Unknown wsPath ' + wsPath);
    });
    const fun = () =>
      listAllTags(
        ['t:1', 't:2', 't:3'].map((t) => createWsPath(t)),
        callback,
        signal,
      );

    await expect(fun()).rejects.toThrowErrorMatchingInlineSnapshot(`"Aborted"`);
    expect(callback).toBeCalledTimes(2);
  });
});
