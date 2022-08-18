/**
 * @jest-environment @bangle.io/jsdom-env
 */

/** @jsx psx */
/// <reference path="../../../missing-test-types.d.ts" />

import { defaultPlugins, defaultSpecs } from '@bangle.dev/all-base-components';
import { SpecRegistry } from '@bangle.dev/core';
import { PluginKey } from '@bangle.dev/pm';
import { psx, renderTestEditor } from '@bangle.dev/test-helpers';

import { getDocsChildren } from '..';
import { intersectionObserverPlugin } from '../intersection-observer-plugin';

const pluginKey = new PluginKey();
const specRegistry = new SpecRegistry([...defaultSpecs()]);
const plugins = [
  ...defaultPlugins(),
  intersectionObserverPlugin({
    pluginKey: pluginKey,
    intersectionObserverOpts: {
      root: window.document.body,
      rootMargin: '0px',
      threshold: 0,
    },
  }),
];

describe('getDocsChildren', () => {
  test('gets children', async () => {
    const testEditor = renderTestEditor({
      specRegistry,
      plugins,
    });

    const { view } = await testEditor(
      <doc>
        <para>foohello</para>
        <para>lastpara[]bar</para>
        <ul>
          <li>
            <para>top</para>
          </li>
          <li>
            <para>second</para>
          </li>
          <li>
            <para>third</para>
          </li>
        </ul>
      </doc>,
    );

    const children = getDocsChildren(view);
    expect(children.size).toBe(3);

    expect(children).toMatchInlineSnapshot(`
      Set {
        <p>
          foohello
        </p>,
        <p>
          lastparabar
        </p>,
        <ul>
          <li
            class="bangle-nv-container"
            data-bangle-name="listItem"
          >
            <span
              class="bangle-nv-content"
            >
              <p>
                top
              </p>
            </span>
          </li>
          <li
            class="bangle-nv-container"
            data-bangle-name="listItem"
          >
            <span
              class="bangle-nv-content"
            >
              <p>
                second
              </p>
            </span>
          </li>
          <li
            class="bangle-nv-container"
            data-bangle-name="listItem"
          >
            <span
              class="bangle-nv-content"
            >
              <p>
                third
              </p>
            </span>
          </li>
        </ul>,
      }
    `);
  });
});
