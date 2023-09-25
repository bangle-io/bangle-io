/**
 * @jest-environment @bangle.io/jsdom-env
 */
import { act, render } from '@testing-library/react';
import React from 'react';

import { WorkspaceType } from '@bangle.io/constants';
import type { WorkspaceInfo } from '@bangle.io/shared-types';
import { sleep } from '@bangle.io/utils';

import { workspacePalette } from '../WorkspacePalette';
import { setupTestExtension } from '@bangle.io/test-utils-2';
import corePalettes from '../index';

let abortController = new AbortController();

beforeEach(() => {
  abortController = new AbortController();
});

afterEach(async () => {
  abortController.abort();
});

async function setup() {
  const ctx = setupTestExtension({
    extensions: [corePalettes],
    abortSignal: abortController.signal,
  });

  return ctx;
}

test('Component renders correctly when multiple workspaces', async () => {
  const ctx = await setup();

  const wsName = 'test-ws1';

  await ctx.createWorkspace(wsName);

  await ctx.createWorkspace(`test-ws2`);

  const dismissPalette = jest.fn();
  const onSelect = jest.fn();
  const getActivePaletteItem = jest.fn();
  const { container } = render(
    <ctx.ContextProvider>
      <workspacePalette.ReactComponent
        query=""
        paletteType={undefined}
        paletteMetadata={{}}
        updatePalette={() => {}}
        counter={0}
        updateCounter={() => {}}
        dismissPalette={dismissPalette}
        onSelect={onSelect}
        getActivePaletteItem={getActivePaletteItem}
        allPalettes={[]}
      />
    </ctx.ContextProvider>,
  );

  const prom = sleep(50);

  await act(() => prom);

  expect(container.innerHTML.includes('test-ws1')).toBe(true);
  expect(container.innerHTML.includes('test-ws2')).toBe(true);

  expect(
    container.querySelector('.B-ui-components_universal-palette-item'),
  ).toMatchSnapshot();
});

test('Component renders correctly when no workspaces', async () => {
  const ctx = await setup();
  await sleep(10);

  const dismissPalette = jest.fn();
  const onSelect = jest.fn();
  const getActivePaletteItem = jest.fn();
  const { container } = render(
    <ctx.ContextProvider>
      <workspacePalette.ReactComponent
        query=""
        paletteType={undefined}
        paletteMetadata={{}}
        updatePalette={() => {}}
        counter={0}
        updateCounter={() => {}}
        dismissPalette={dismissPalette}
        onSelect={onSelect}
        getActivePaletteItem={getActivePaletteItem}
        allPalettes={[]}
      />
    </ctx.ContextProvider>,
  );

  const prom = sleep(50);

  await act(() => prom);

  expect(container.innerHTML.includes('helpfs')).toBe(true);

  expect(
    container.querySelector('.B-ui-components_universal-palette-item'),
  ).toMatchSnapshot();
});
