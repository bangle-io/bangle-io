/**
 * @jest-environment @bangle.io/jsdom-env
 */

import { setupTestExtension } from '@bangle.io/test-utils-2';
import React from 'react';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import inlineBackLinkExtension from '../index';
import { InlineBacklinkPaletteWrapper } from '../editor/InlineBacklinkPalette';
import { nsmApi2 } from '@bangle.io/api';
import { assertNotUndefined, sleep } from '@bangle.io/utils';
import { BacklinkWidget } from '../BacklinkWidget';

let abortController = new AbortController();

beforeEach(() => {
  abortController = new AbortController();
});

afterEach(async () => {
  abortController.abort();
});

async function setup({
  wsName,
  notes,
  fullEditor = false,
}: { wsName?: string; notes?: [string, string][]; fullEditor?: boolean } = {}) {
  const ctx = setupTestExtension({
    extensions: [inlineBackLinkExtension],
    abortSignal: abortController.signal,
    editor: true,
    fullEditor: fullEditor,
  });

  if (wsName) {
    await ctx.createWorkspace(wsName);
  }

  await ctx.createNotes(notes, { loadFirst: true });

  return ctx;
}

describe('BacklinkNode', () => {
  test('renders when no link found', async () => {
    const wsPath = 'test-ws:hi.md';
    const ctx = await setup({
      wsName: 'test-ws',
      notes: [[wsPath, `hello world`]],
    });

    await render(
      <ctx.ContextProvider>
        <BacklinkWidget />
      </ctx.ContextProvider>,
    );

    await sleep(50);

    expect(screen.getByTestId('inline-backlink_widget-container'))
      .toMatchInlineSnapshot(`
      <div
        class="flex flex-col"
        data-testid="inline-backlink_widget-container"
      >
        <span>
          🐒 No backlinks found!
          <br />
          <span
            class="font-light"
          >
            Create one by typing 
            <kbd
              class="font-normal"
            >
              [[
            </kbd>
             followed by the name of the note.
          </span>
        </span>
      </div>
    `);
  });

  test('renders when no link found', async () => {
    const wsPath = 'test-ws:hi.md';
    const ctx = await setup({
      wsName: 'test-ws',
      notes: [[wsPath, `hello world [[my/note-path|monako]]`]],
      fullEditor: true,
    });

    await render(
      <ctx.ContextProvider>
        <BacklinkWidget />
      </ctx.ContextProvider>,
    );

    await sleep(50);

    expect(screen.getByTestId('inline-backlink-button')).toMatchInlineSnapshot(`
      <button
        aria-label="monako"
        class="B-inline-backlink_backlink-node hover:underline inline-flex gap-0_5 flex-row items-center rounded py-0 px-1 mx-1 text-start B-inline-backlink_backlink-node-not-found "
        data-testid="inline-backlink-button"
        draggable="false"
      >
        <span>
          <svg
            class="h-4 w-4 text-colorPromoteIcon"
            stroke="currentColor"
            style="fill: var(--BV-miscEditorBacklinkBg);"
            viewBox="0 0 18 18"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M10,5.5V1H3.5a.5.5,0,0,0-.5.5v15a.5.5,0,0,0,.5.5h11a.5.5,0,0,0,.5-.5V6H10.5A.5.5,0,0,1,10,5.5Z"
            />
            <path
              d="M11,1h.043a.5.5,0,0,1,.3535.1465l3.457,3.457A.5.5,0,0,1,15,4.957V5H11Z"
            />
          </svg>
        </span>
        <span
          class="inline whitespace-break-spaces"
        >
          monako
        </span>
      </button>
    `);
  });
});
