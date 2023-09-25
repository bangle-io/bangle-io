/**
 * @jest-environment @bangle.io/jsdom-env
 */
import { act, render } from '@testing-library/react';
import React from 'react';

import { nsmApi2, useSerialOperationHandler } from '@bangle.io/api';
import {
  PRIMARY_EDITOR_INDEX,
  SECONDARY_EDITOR_INDEX,
} from '@bangle.io/constants';
import type { DispatchSerialOperationType } from '@bangle.io/shared-types';

import noteOutlineExtension from '..';
import { WATCH_HEADINGS_PLUGIN_STATE_UPDATE_OP } from '../config';
import { getEditorIntersectionObserverPluginState } from '../helpers';
import { NoteOutline } from '../NoteOutline';
import { setupTestExtension, testEditor } from '@bangle.io/test-utils-2';
import { createWsName } from '@bangle.io/ws-path';
import { sleep } from '@bangle.io/utils';

let abortController = new AbortController();

beforeEach(() => {
  abortController = new AbortController();
});

afterEach(async () => {
  abortController.abort();
});

async function setup({
  wsName,
  notes = [],
}: { wsName?: string; notes?: [string, string][] } = {}) {
  const ctx = setupTestExtension({
    extensions: [noteOutlineExtension],
    abortSignal: abortController.signal,
    editor: true,
    fullEditor: true,
  });

  if (wsName) {
    await ctx.createWorkspace(wsName);
  }
  await ctx.createNotes(notes, { loadFirst: true });

  return ctx;
}

test('renders when no headings found', async () => {
  const ctx = await setup();

  const renderResult = render(
    <ctx.ContextProvider>
      <NoteOutline />
    </ctx.ContextProvider>,
  );

  expect(renderResult.container).toMatchInlineSnapshot(`
      <div>
        <div
          class="note-outline_container flex flex-col"
        >
          <span>
            🐒 No headings found!
            <br />
            <span
              class="font-light"
            >
              Create heading by typing # followed by a space.
            </span>
          </span>
        </div>
      </div>
  `);
});

test('renders headings when focused with editor', async () => {
  const ctx = await setup({
    wsName: 'test-ws',
    notes: [
      [
        'test-ws:note-1.md',
        `# hello 1

para 1

## hello 2 

para 2`,
      ],
    ],
  });

  const renderResult = render(
    <ctx.ContextProvider>
      <NoteOutline />
    </ctx.ContextProvider>,
  );

  await act(async () => {
    await sleep(10);
    renderResult.rerender(
      <ctx.ContextProvider>
        <NoteOutline />
      </ctx.ContextProvider>,
    );
    await sleep(150);
  });

  const [button1, button2] = Array.from(
    renderResult.container?.querySelectorAll('button'),
  );
  expect(button1?.innerHTML).toContain('hello 1');
  expect(button1?.style.paddingLeft).toBe('0px');
  expect(button2?.innerHTML).toContain('hello 2');
  expect(button2?.style.paddingLeft).toBe('12px');

  expect(renderResult.container?.querySelector('.note-outline_container'))
    .toMatchInlineSnapshot(`
    <div
      class="note-outline_container flex flex-col"
    >
      <button
        aria-label="hello 1"
        class="text-sm font-600 h-8 min-w-8 px-2  select-none inline-flex justify-center items-center rounded-md whitespace-nowrap overflow-hidden py-1 transition-all duration-100 cursor-pointer "
        style="padding-left: 0px; padding-top: 4px; padding-bottom: 4px; white-space: nowrap;"
        type="button"
      >
        <span
          class="flex flex-grow-1 overflow-hidden "
          style="justify-content: flex-start;"
        >
          <span
            class="text-ellipsis overflow-hidden "
          >
            <span
              class="pl-1"
            >
              hello 1
            </span>
          </span>
        </span>
      </button>
      <button
        aria-label="hello 2"
        class="text-sm font-600 h-8 min-w-8 px-2  select-none inline-flex justify-center items-center rounded-md whitespace-nowrap overflow-hidden py-1 transition-all duration-100 cursor-pointer "
        style="background-color: transparent; padding-left: 12px; padding-top: 4px; padding-bottom: 4px; white-space: nowrap;"
        type="button"
      >
        <span
          class="flex flex-grow-1 overflow-hidden "
          style="justify-content: flex-start;"
        >
          <span
            class="text-ellipsis overflow-hidden "
          >
            <span
              class="pl-1"
            >
              hello 2
            </span>
          </span>
        </span>
      </button>
    </div>
  `);
});
