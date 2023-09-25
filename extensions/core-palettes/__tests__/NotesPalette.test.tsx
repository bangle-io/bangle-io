/**
 * @jest-environment @bangle.io/jsdom-env
 */
import { act, renderHook } from '@testing-library/react-hooks';
import React from 'react';
import { getUseWorkspaceContextReturn } from '@bangle.io/test-utils';
import { sleep } from '@bangle.io/utils';
import { naukarProxy } from '@bangle.io/worker-naukar-proxy';

import { notesPalette, useSearchWsPaths } from '../NotesPalette';
import { setupTestExtension } from '@bangle.io/test-utils-2';
import corePalettes from '../index';
import { render } from '@testing-library/react';

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

describe('NotesPalette', () => {
  test('works correctly', async () => {
    const ctx = await setup();

    const wsName = 'test-ws1';

    await ctx.createWorkspace(wsName);

    await ctx.createNotes(
      [
        [`${wsName}:note1.md`, 'content1'],
        [`${wsName}:note2.md`, 'content2'],
      ],
      {
        loadFirst: true,
      },
    );

    const dismissPalette = jest.fn();
    const onSelect = jest.fn();
    const getActivePaletteItem = jest.fn();

    const { container, rerender } = render(
      <ctx.ContextProvider>
        <notesPalette.ReactComponent
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

    await sleep(250);

    let result = container.querySelectorAll(
      '.B-ui-components_universal-palette-item',
    );
    expect([...result]).toHaveLength(2);

    expect(result[0].textContent).toContain('note1');
    expect(result[1].textContent).toContain('note2');

    rerender(
      <ctx.ContextProvider>
        <notesPalette.ReactComponent
          query="2"
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

    await sleep(20);

    result = container.querySelectorAll(
      '.B-ui-components_universal-palette-item',
    );

    expect([...result]).toHaveLength(1);

    expect(result[0].textContent).toContain('note2');
  });
});
