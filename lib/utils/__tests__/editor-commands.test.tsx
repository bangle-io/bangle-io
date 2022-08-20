/**
 * @jest-environment @bangle.io/jsdom-env
 */
/** @jsx psx */
/// <reference path="../../../missing-test-types.d.ts" />

import { defaultPlugins, defaultSpecs } from '@bangle.dev/all-base-components';
import { SpecRegistry } from '@bangle.dev/core';
import { psx, renderTestEditor } from '@bangle.dev/test-helpers';

import { trimEndWhiteSpaceBeforeCursor } from '../editor-commands';

const specRegistry = new SpecRegistry([...defaultSpecs()]);

describe('trimEndWhiteSpaceBeforeCursor', () => {
  test('works with paragraph', async () => {
    const testEditor = renderTestEditor({
      specRegistry,
      plugins: defaultPlugins(),
    });

    const { view } = testEditor(
      <doc>
        <para>hello []</para>
      </doc>,
    );

    trimEndWhiteSpaceBeforeCursor()(view.state, view.dispatch, view);

    expect(view.state.doc).toEqualDocument(
      <doc>
        <para>hello[]</para>
      </doc>,
    );
  });

  test('does not trim inside of a paragraph', async () => {
    const testEditor = renderTestEditor({
      specRegistry,
      plugins: defaultPlugins(),
    });

    const { view } = testEditor(
      <doc>
        <para>hello []world</para>
      </doc>,
    );

    trimEndWhiteSpaceBeforeCursor()(view.state, view.dispatch, view);

    expect(view.state.doc).toEqualDocument(
      <doc>
        <para>hello []world</para>
      </doc>,
    );
  });

  test('works with empty paragraph', async () => {
    const testEditor = renderTestEditor({
      specRegistry,
      plugins: [],
    });

    const { view } = testEditor(
      <doc>
        <para> []</para>
      </doc>,
    );

    trimEndWhiteSpaceBeforeCursor()(view.state, view.dispatch, view);

    expect(view.state.doc).toEqualDocument(
      <doc>
        <para>[]</para>
      </doc>,
    );
  });

  test('works with list', async () => {
    const testEditor = renderTestEditor({
      specRegistry,
      plugins: [],
    });

    const { view } = testEditor(
      <doc>
        <ul>
          <li>
            <para> []</para>
          </li>
        </ul>
      </doc>,
    );

    trimEndWhiteSpaceBeforeCursor()(view.state, view.dispatch, view);

    expect(view.state.doc).toEqualDocument(
      <doc>
        <ul>
          <li>
            <para>[]</para>
          </li>
        </ul>
      </doc>,
    );
  });

  test('works with blockquote', async () => {
    const testEditor = renderTestEditor({
      specRegistry,
      plugins: [],
    });

    const { view } = testEditor(
      <doc>
        <blockquote>
          <para> []</para>
        </blockquote>
      </doc>,
    );

    trimEndWhiteSpaceBeforeCursor()(view.state, view.dispatch, view);

    expect(view.state.doc).toEqualDocument(
      <doc>
        <blockquote>
          <para>[]</para>
        </blockquote>
      </doc>,
    );
  });
  test('works with codeBlock', async () => {
    const testEditor = renderTestEditor({
      specRegistry,
      plugins: [],
    });

    const { view } = testEditor(
      <doc>
        <ul>
          <li>
            <para>top</para>
          </li>
        </ul>
        <codeBlock>hello []</codeBlock>
      </doc>,
    );

    trimEndWhiteSpaceBeforeCursor()(view.state, view.dispatch, view);

    expect(view.state.doc).toEqualDocument(
      <doc>
        <ul>
          <li>
            <para>top</para>
          </li>
        </ul>
        <codeBlock>hello[]</codeBlock>
      </doc>,
    );
  });
});
