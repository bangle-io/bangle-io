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
import { listTags } from '../search';

const specRegistry = new SpecRegistry([...defaultSpecs(), editorTagSpec()]);
const testEditor = renderTestEditor({
  specRegistry,
  plugins: defaultPlugins(),
});

test('one tag', async () => {
  const { view } = testEditor(
    <doc>
      <para>
        Hello <tag tagValue="hi" />
      </para>
    </doc>,
  );

  expect(listTags(view.state.doc)).toEqual(['hi']);
});

test('two same tag', async () => {
  const { view } = testEditor(
    <doc>
      <para>
        <tag tagValue="hi" /> Hello <tag tagValue="hi" />
      </para>
    </doc>,
  );

  expect(listTags(view.state.doc)).toEqual(['hi']);
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

  expect(listTags(view.state.doc)).toEqual(['hi', 'hi2', 'bye', 'bye2']);
});
