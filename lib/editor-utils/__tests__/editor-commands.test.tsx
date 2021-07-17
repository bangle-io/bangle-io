/**
 * @jest-environment jsdom
 */
/** @jsx psx */
/// <reference path="../../../missing-test-types.d.ts" />

import { PluginKey, SpecRegistry } from '@bangle.dev/core';
import {
  psx,
  renderTestEditor,
} from '@bangle.dev/core/test-helpers/test-helpers';
import { defaultSpecs } from '@bangle.dev/core/test-helpers/default-components';
import { trimWhiteSpaceBeforeCursor } from '../editor-commands';
const specRegistry = new SpecRegistry([...defaultSpecs()]);

describe('trimWhiteSpaceBeforeCursor', () => {
  test('works with paragraph', async () => {
    const testEditor = renderTestEditor({
      specRegistry,
      plugins: [],
    });

    const { container, view } = testEditor(
      <doc>
        <para>hello []</para>
      </doc>,
    );

    trimWhiteSpaceBeforeCursor()(view.state, view.dispatch, view);

    expect(view.state.doc).toEqualDocument(
      <doc>
        <para>hello[]</para>
      </doc>,
    );
  });

  test('works with empty paragraph', async () => {
    const testEditor = renderTestEditor({
      specRegistry,
      plugins: [],
    });

    const { container, view } = testEditor(
      <doc>
        <para> []</para>
      </doc>,
    );

    trimWhiteSpaceBeforeCursor()(view.state, view.dispatch, view);

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

    const { container, view } = testEditor(
      <doc>
        <ul>
          <li>
            <para> []</para>
          </li>
        </ul>
      </doc>,
    );

    trimWhiteSpaceBeforeCursor()(view.state, view.dispatch, view);

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

    const { container, view } = testEditor(
      <doc>
        <blockquote>
          <para> []</para>
        </blockquote>
      </doc>,
    );

    trimWhiteSpaceBeforeCursor()(view.state, view.dispatch, view);

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

    const { container, view } = testEditor(
      <doc>
        <ul>
          <li>
            <para>top</para>
          </li>
        </ul>
        <codeBlock>hello []</codeBlock>
      </doc>,
    );

    trimWhiteSpaceBeforeCursor()(view.state, view.dispatch, view);

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
