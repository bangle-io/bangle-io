/**
 * @jest-environment @bangle.io/jsdom-env
 */
/** @jsx psx */
/// <reference path="../../../missing-test-types.d.ts" />
/// <reference path="./missing-test-types.d.ts" />

import { SpecRegistry } from '@bangle.dev/core';
import { defaultSpecs } from '@bangle.dev/all-base-components';
import { psx, renderTestEditor } from '@bangle.dev/test-helpers';
import { wikiLink } from '@bangle.dev/wiki-link';

import { createWsPath } from '@bangle.io/ws-path';

import { calcWikiLinkMapping, getAllWikiLinks } from '../calculate-matches';

const specRegistry = new SpecRegistry([...defaultSpecs(), wikiLink.spec()]);

const testEditor = renderTestEditor({
  specRegistry,
  plugins: [],
});

describe('calcWikiLinkMapping', () => {
  test('no match 1', () => {
    const { editorView } = testEditor(
      <doc>
        <para>
          Hello <wikiLink path="magic" />
        </para>
      </doc>,
    );

    expect([
      ...calcWikiLinkMapping(
        ['my-ws:hello.md'].map((wsPath) => createWsPath(wsPath)),
        getAllWikiLinks(editorView.state),
      ),
    ]).toEqual([]);
  });

  test('no match 2', () => {
    const { editorView } = testEditor(
      <doc>
        <para>
          Hello <wikiLink path="test/hello" />
        </para>
      </doc>,
    );

    expect([
      ...calcWikiLinkMapping(
        ['my-ws:hello.md'].map((wsPath) => createWsPath(wsPath)),
        getAllWikiLinks(editorView.state),
      ),
    ]).toEqual([]);
  });

  test('should not match paths having /', () => {
    const { editorView } = testEditor(
      <doc>
        <para>
          Hello <wikiLink path="test/hello" />
        </para>
      </doc>,
    );

    expect([
      ...calcWikiLinkMapping(
        ['my-ws:hello.md'].map((wsPath) => createWsPath(wsPath)),
        getAllWikiLinks(editorView.state),
      ),
    ]).toEqual([]);
  });

  test('direct match', () => {
    const { editorView } = testEditor(
      <doc>
        <para>
          Hello <wikiLink path="hello" />
        </para>
      </doc>,
    );

    expect([
      ...calcWikiLinkMapping(
        ['my-ws:hello.md'].map((wsPath) => createWsPath(wsPath)),
        getAllWikiLinks(editorView.state),
      ),
    ]).toEqual([['hello', 'my-ws:hello.md']]);
  });

  test('indirect match 1', () => {
    const { editorView } = testEditor(
      <doc>
        <para>
          Hello <wikiLink path="hello" />
        </para>
      </doc>,
    );

    expect([
      ...calcWikiLinkMapping(
        ['my-ws:test/hello.md'].map((wsPath) => createWsPath(wsPath)),
        getAllWikiLinks(editorView.state),
      ),
    ]).toEqual([['hello', 'my-ws:test/hello.md']]);
  });

  test('chooses least nested when multiple paths', () => {
    const { editorView } = testEditor(
      <doc>
        <para>
          Hello <wikiLink path="hello" />
        </para>
      </doc>,
    );

    expect([
      ...calcWikiLinkMapping(
        ['my-ws:test/what/hello.md', 'my-ws:test/hello.md'].map((wsPath) =>
          createWsPath(wsPath),
        ),
        getAllWikiLinks(editorView.state),
      ),
    ]).toEqual([['hello', 'my-ws:test/hello.md']]);
  });

  test('works with relative path without dot prefix and  with no extension', () => {
    const { editorView } = testEditor(
      <doc>
        <para>
          Hello <wikiLink path="test/hello" />
        </para>
      </doc>,
    );

    expect([
      ...calcWikiLinkMapping(
        ['my-ws:test/hello.md'].map((wsPath) => createWsPath(wsPath)),
        getAllWikiLinks(editorView.state),
      ),
    ]).toEqual([['test/hello', 'my-ws:test/hello.md']]);
  });

  test('works with relative path without dot prefix and with extension', () => {
    const { editorView } = testEditor(
      <doc>
        <para>
          Hello <wikiLink path="test/hello.md" />
        </para>
      </doc>,
    );

    expect([
      ...calcWikiLinkMapping(
        ['my-ws:test/hello.md'].map((wsPath) => createWsPath(wsPath)),
        getAllWikiLinks(editorView.state),
      ),
    ]).toEqual([['test/hello.md', 'my-ws:test/hello.md']]);
  });

  test('no match works with relative path without dot prefix and  with different extension', () => {
    const { editorView } = testEditor(
      <doc>
        <para>
          Hello <wikiLink path="test/hello.txt" />
        </para>
      </doc>,
    );

    expect([
      ...calcWikiLinkMapping(
        ['my-ws:test/hello.md'].map((wsPath) => createWsPath(wsPath)),
        getAllWikiLinks(editorView.state),
      ),
    ]).toEqual([]);
  });

  test('works with multiple paths', () => {
    const { editorView } = testEditor(
      <doc>
        <para>
          Hello <wikiLink path="hello" />
        </para>
        <para>
          Hello <wikiLink path="test/hello" />
        </para>
        <para>
          Hello <wikiLink path="no-hello" />
        </para>
      </doc>,
    );

    expect([
      ...calcWikiLinkMapping(
        ['my-ws:test/what/hello.md', 'my-ws:test/hello.md'].map((wsPath) =>
          createWsPath(wsPath),
        ),
        getAllWikiLinks(editorView.state),
      ),
    ]).toEqual([
      ['hello', 'my-ws:test/hello.md'],
      ['test/hello', 'my-ws:test/hello.md'],
    ]);
  });

  test('when not absolute it is case insensitive', () => {
    const { editorView } = testEditor(
      <doc>
        <para>
          Hello <wikiLink path="Hello" />
        </para>
      </doc>,
    );

    expect([
      ...calcWikiLinkMapping(
        ['my-ws:test/what/hello.md', 'my-ws:test/hello.md'].map((wsPath) =>
          createWsPath(wsPath),
        ),
        getAllWikiLinks(editorView.state),
      ),
    ]).toEqual([['Hello', 'my-ws:test/hello.md']]);
  });

  test('treats wiki path differing by case correctly', () => {
    const { editorView } = testEditor(
      <doc>
        <para>
          Hello <wikiLink path="Hello" />
        </para>
        <para>
          Hello <wikiLink path="hello" />
        </para>
      </doc>,
    );

    expect([
      ...calcWikiLinkMapping(
        ['my-ws:test/what/hello.md', 'my-ws:test/hello.md'].map((wsPath) =>
          createWsPath(wsPath),
        ),
        getAllWikiLinks(editorView.state),
      ),
    ]).toEqual([
      ['Hello', 'my-ws:test/hello.md'],
      ['hello', 'my-ws:test/hello.md'],
    ]);
  });

  test('works with absolute path', () => {
    const { editorView } = testEditor(
      <doc>
        <para>
          Hello <wikiLink path="/magic/some/note2.md" />
        </para>
      </doc>,
    );

    expect([
      ...calcWikiLinkMapping(
        [
          'my-ws:magic/some-place/hotel/note1.md',
          'my-ws:magic/some/note2.md',
          'my-ws:magic/note2.md',
        ].map((wsPath) => createWsPath(wsPath)),
        getAllWikiLinks(editorView.state),
      ),
    ]).toEqual([['/magic/some/note2.md', 'my-ws:magic/some/note2.md']]);
  });

  test('prefers exact match over case insensitive match', () => {
    const { editorView } = testEditor(
      <doc>
        <para>
          Hello <wikiLink path="Hello" />
        </para>
        <para>
          Hello <wikiLink path="hello" />
        </para>
      </doc>,
    );

    expect([
      ...calcWikiLinkMapping(
        ['my-ws:test/what/Hello.md', 'my-ws:test/hello.md'].map((wsPath) =>
          createWsPath(wsPath),
        ),
        getAllWikiLinks(editorView.state),
      ),
    ]).toEqual([
      ['Hello', 'my-ws:test/what/Hello.md'],
      ['hello', 'my-ws:test/hello.md'],
    ]);
  });

  test('if wiki link has extension 1', () => {
    const { editorView } = testEditor(
      <doc>
        <para>
          Hello <wikiLink path="Hello.txt" />
        </para>
        <para>
          Hello <wikiLink path="hello.md" />
        </para>
      </doc>,
    );

    expect([
      ...calcWikiLinkMapping(
        ['my-ws:test/what/Hello.md', 'my-ws:test/hello.md'].map((wsPath) =>
          createWsPath(wsPath),
        ),
        getAllWikiLinks(editorView.state),
      ),
    ]).toEqual([['hello.md', 'my-ws:test/hello.md']]);
  });

  test('if wiki link has extension 2', () => {
    const { editorView } = testEditor(
      <doc>
        <para>
          Hello <wikiLink path="Hello.md" />
        </para>
        <para>
          Hello <wikiLink path="hello.md" />
        </para>
      </doc>,
    );

    expect([
      ...calcWikiLinkMapping(
        ['my-ws:test/what/hello.md', 'my-ws:test/by.md'].map((wsPath) =>
          createWsPath(wsPath),
        ),
        getAllWikiLinks(editorView.state),
      ),
    ]).toEqual([
      ['Hello.md', 'my-ws:test/what/hello.md'],
      ['hello.md', 'my-ws:test/what/hello.md'],
    ]);
  });

  test('if wiki link has extension 3', () => {
    const { editorView } = testEditor(
      <doc>
        <para>
          Hello <wikiLink path="Hello.md" />
        </para>
        <para>
          Hello <wikiLink path="hello.md" />
        </para>
      </doc>,
    );

    expect([
      ...calcWikiLinkMapping(
        ['my-ws:test/what/hello.txt'].map((wsPath) => createWsPath(wsPath)),
        getAllWikiLinks(editorView.state),
      ),
    ]).toEqual([]);
  });

  test('if no wikiLink extension matches without extension in consideration', () => {
    const { editorView } = testEditor(
      <doc>
        <para>
          Hello <wikiLink path="hello" />
        </para>
      </doc>,
    );

    expect([
      ...calcWikiLinkMapping(
        ['my-ws:test/what/hello.txt'].map((wsPath) => createWsPath(wsPath)),
        getAllWikiLinks(editorView.state),
      ),
    ]).toEqual([['hello', 'my-ws:test/what/hello.txt']]);
  });

  test('filename with dot: case 1', () => {
    const { editorView } = testEditor(
      <doc>
        <para>
          Hello <wikiLink path="Hello.io" />
        </para>
        <para>
          Hello <wikiLink path="hello.xyz" />
        </para>
      </doc>,
    );

    expect([
      ...calcWikiLinkMapping(
        ['my-ws:Hello.io.md'].map((wsPath) => createWsPath(wsPath)),
        getAllWikiLinks(editorView.state),
      ),
    ]).toEqual([['Hello.io', 'my-ws:Hello.io.md']]);
  });

  test('filename with dot: case 2 case mismatch', () => {
    const { editorView } = testEditor(
      <doc>
        <para>
          Hello <wikiLink path="Hello.io" />
        </para>
        <para>
          Hello <wikiLink path="hello.xyz" />
        </para>
      </doc>,
    );

    expect([
      ...calcWikiLinkMapping(
        ['my-ws:hello.io.md'].map((wsPath) => createWsPath(wsPath)),
        getAllWikiLinks(editorView.state),
      ),
    ]).toEqual([['Hello.io', 'my-ws:hello.io.md']]);
  });

  test('filename with dot: case 3 case mismatch', () => {
    const { editorView } = testEditor(
      <doc>
        <para>
          Hello <wikiLink path="hello.io" />
        </para>
        <para>
          Hello <wikiLink path="hello.xyz" />
        </para>
      </doc>,
    );

    expect([
      ...calcWikiLinkMapping(
        ['my-ws:Hello.io.md'].map((wsPath) => createWsPath(wsPath)),
        getAllWikiLinks(editorView.state),
      ),
    ]).toEqual([['hello.io', 'my-ws:Hello.io.md']]);
  });

  test('filename with dot: case 4', () => {
    const { editorView } = testEditor(
      <doc>
        <para>
          Hello <wikiLink path="hello.io" />
        </para>
        <para>
          Hello <wikiLink path="hello.xyz" />
        </para>
      </doc>,
    );

    expect([
      ...calcWikiLinkMapping(
        ['my-ws:Hello.io.md', 'my-ws:Hello.xyz.md'].map((wsPath) =>
          createWsPath(wsPath),
        ),
        getAllWikiLinks(editorView.state),
      ),
    ]).toEqual([
      ['hello.io', 'my-ws:Hello.io.md'],
      ['hello.xyz', 'my-ws:Hello.xyz.md'],
    ]);
  });

  test('filename with dot: case 5', () => {
    const { editorView } = testEditor(
      <doc>
        <para>
          Hello <wikiLink path="bugs in bangle.io" />
        </para>
        <para>
          Hello <wikiLink path="hello.xyz" />
        </para>
      </doc>,
    );

    expect([
      ...calcWikiLinkMapping(
        ['my-ws:task/bugs in bangle.io.md', 'my-ws:task/bugs in bangle.md'].map(
          (wsPath) => createWsPath(wsPath),
        ),
        getAllWikiLinks(editorView.state),
      ),
    ]).toEqual([['bugs in bangle.io', 'my-ws:task/bugs in bangle.io.md']]);
  });
});
