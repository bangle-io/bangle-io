/**
 * @jest-environment jsdom
 */
/** @jsx psx */
/// <reference path="../../../missing-test-types.d.ts" />
/// <reference path="./missing-test-types.d.ts" />

import { defaultPlugins, defaultSpecs } from '@bangle.dev/all-base-components';
import { markdownSerializer } from '@bangle.dev/markdown';
import { psx } from '@bangle.dev/test-helpers';
import { SpecRegistry } from '@bangle.dev/core';
import {
  getDefaultMarkdownItTokenizer,
  markdownParser,
} from '@bangle.dev/markdown/markdown-parser';
import { editorTagSpec, noteTagsMarkdownItPlugin } from '../editor-tag';

const specRegistry = new SpecRegistry([...defaultSpecs(), editorTagSpec()]);
const plugins = [...defaultPlugins()];

const serialize = async (doc) => {
  let content = doc;
  if (typeof doc === 'function') {
    content = doc(specRegistry.schema);
  }
  return markdownSerializer(specRegistry).serialize(content);
};

const parse = async (md) =>
  markdownParser(
    specRegistry,
    getDefaultMarkdownItTokenizer().use(noteTagsMarkdownItPlugin),
  ).parse(md);

describe('Parses markdown correctly', () => {
  test('test 1', async () => {
    const md = `Hello #hi`;
    const doc = (
      <doc>
        <para>
          Hello <tag tagValue="hi" />
        </para>
      </doc>
    );
    expect(await parse(md)).toEqualDocument(doc);
  });

  test('works with -', async () => {
    const md = `Hello #hi-hello`;
    const doc = (
      <doc>
        <para>
          Hello <tag tagValue="hi-hello" />
        </para>
      </doc>
    );
    expect(await parse(md)).toEqualDocument(doc);
  });

  test('works with /', async () => {
    const md = `Hello #hi/hello`;
    const doc = (
      <doc>
        <para>
          Hello <tag tagValue="hi/hello" />
        </para>
      </doc>
    );
    expect(await parse(md)).toEqualDocument(doc);
  });

  test('works with <space>', async () => {
    const md = `Hello #hi hello`;
    const doc = (
      <doc>
        <para>
          Hello <tag tagValue="hi" /> hello
        </para>
      </doc>
    );
    expect(await parse(md)).toEqualDocument(doc);
  });

  test('works with multiple hash tags', async () => {
    const md = `Hello #hi #hello`;
    const doc = (
      <doc>
        <para>
          Hello <tag tagValue="hi" /> <tag tagValue="hello" />
        </para>
      </doc>
    );
    expect(await parse(md)).toEqualDocument(doc);
  });

  test('not hashtag cases', async () => {
    expect(await parse(`Hello #hi#hello`)).toEqualDocument(
      <doc>
        <para>
          Hello <tag tagValue="hi" />
          #hello
        </para>
      </doc>,
    );
    expect(await parse(`Hello hi#hello`)).toEqualDocument(
      <doc>
        <para>Hello hi#hello</para>
      </doc>,
    );

    expect(await parse(`Hello hi#hello`)).toEqualDocument(
      <doc>
        <para>Hello hi#hello</para>
      </doc>,
    );

    expect(await parse(`hi#hello`)).toEqualDocument(
      <doc>
        <para>hi#hello</para>
      </doc>,
    );

    expect(await parse(`#hello`)).toEqualDocument(
      <doc>
        <para>
          <tag tagValue="hello" />
        </para>
      </doc>,
    );

    expect(await parse(`I # hello`)).toEqualDocument(
      <doc>
        <para>I # hello</para>
      </doc>,
    );

    expect(await parse(`I ## hello`)).toEqualDocument(
      <doc>
        <para>I ## hello</para>
      </doc>,
    );

    expect(await parse(`I #$ hello`)).toEqualDocument(
      <doc>
        <para>I #$ hello</para>
      </doc>,
    );

    expect(await parse(`I #$ hello`)).toEqualDocument(
      <doc>
        <para>I #$ hello</para>
      </doc>,
    );
  });

  test.each(['`', '\\', ...`'"~!@#$%^&*(){}-+=:;,<.>/?`])(
    'Case %# misc char %s',
    async (str) => {
      expect(await parse(`I #${str} hello`)).toEqualDocument(
        <doc>
          <para>I #{str} hello</para>
        </doc>,
      );
    },
  );

  test('Case `', async () => {
    expect(await parse(`I #hello\` hello`)).toEqualDocument(
      <doc>
        <para>
          I <tag tagValue={'hello'} />` hello
        </para>
      </doc>,
    );
  });

  test("Case '", async () => {
    expect(await parse(`I #hello' hello`)).toEqualDocument(
      <doc>
        <para>
          I <tag tagValue={'hello'} />' hello
        </para>
      </doc>,
    );
  });

  test('Case #', async () => {
    expect(await parse(`I #hello# hello`)).toEqualDocument(
      <doc>
        <para>
          I <tag tagValue={'hello'} /># hello
        </para>
      </doc>,
    );
  });

  test('Case works with url', async () => {
    expect(await parse(`I https://google.com#hello hello`)).toEqualDocument(
      <doc>
        <para>I https://google.com#hello hello</para>
      </doc>,
    );
  });

  test('Hash in heading', async () => {
    expect(await parse(`# #heading`)).toEqualDocument(
      <doc>
        <heading>
          <tag tagValue="heading" />
        </heading>
      </doc>,
    );
  });
});
