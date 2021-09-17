/**
 * @jest-environment jsdom
 */
/** @jsx psx */
/// <reference path="../../../missing-test-types.d.ts" />
/// <reference path="./missing-test-types.d.ts" />

import { psx, renderTestEditor } from '@bangle.dev/test-helpers';
import { defaultSpecs, defaultPlugins } from '@bangle.dev/all-base-components';
import { SpecRegistry } from '@bangle.dev/core';
import { editorTagSpec } from '../editor-tag';
import { listAllTags, _listTags } from '../search';
import { resolvePath } from 'ws-path';
import type { Node } from '@bangle.dev/pm';

const specRegistry = new SpecRegistry([...defaultSpecs(), editorTagSpec()]);
const testEditor = renderTestEditor({
  specRegistry,
  plugins: defaultPlugins(),
});

describe('search tag in a doc', () => {
  test('one tag', async () => {
    const { view } = testEditor(
      <doc>
        <para>
          Hello <tag tagValue="hi" />
        </para>
      </doc>,
    );

    expect([..._listTags(view.state.doc)]).toEqual(['hi']);
  });

  test('two same tag', async () => {
    const { view } = testEditor(
      <doc>
        <para>
          <tag tagValue="hi" /> Hello <tag tagValue="hi" />
        </para>
      </doc>,
    );

    expect([..._listTags(view.state.doc)]).toEqual(['hi']);
  });

  test('many tags same tag', async () => {
    const { view } = testEditor(
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
    const { view: view1 } = testEditor(
      <doc>
        <para>
          Hello <tag tagValue="hi" />
        </para>
      </doc>,
    );

    const { view: view2 } = testEditor(
      <doc>
        <para>
          Hello <tag tagValue="second" /> <tag tagValue="third" />
        </para>
      </doc>,
    );

    const { view: view3 } = testEditor(
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

    const tagsSet = await listAllTags(['t:1', 't:2', 't:3'], callback, signal);

    expect(tagsSet).toEqual(['hi', 'second', 'third', 'fourth', 'fifth']);
    expect(callback).toBeCalledTimes(3);
  });

  test('aborts correctly', async () => {
    const { view: view1 } = testEditor(
      <doc>
        <para>
          Hello <tag tagValue="hi" />
        </para>
      </doc>,
    );

    const { view: view2 } = testEditor(
      <doc>
        <para>
          Hello <tag tagValue="second" /> <tag tagValue="third" />
        </para>
      </doc>,
    );

    const { view: view3 } = testEditor(
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
    const fun = () => listAllTags(['t:1', 't:2', 't:3'], callback, signal);

    await expect(fun()).rejects.toThrowErrorMatchingInlineSnapshot(`"Aborted"`);
    expect(callback).toBeCalledTimes(2);
  });
});
