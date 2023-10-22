/**
 * @jest-environment @bangle.io/jsdom-env
 */
import { sleep } from '@bangle.io/utils';
import { render, waitFor, screen } from '@testing-library/react';
import React from 'react';
import { setupTestExtension, waitForExpect } from '@bangle.io/test-utils-2';
import { PRIMARY_EDITOR_INDEX } from '@bangle.io/constants';
import { calculateGitFileSha } from '@bangle.io/git-file-sha';
let abortController = new AbortController();

beforeEach(() => {
  abortController = new AbortController();
});

afterEach(async () => {
  abortController.abort();
});

function mdToSha(md: string) {
  return calculateGitFileSha(
    new File([new Blob([md], { type: 'text/plain' })], 'test.md'),
  );
}

async function setup() {
  const ctx = await setupTestExtension({
    abortSignal: abortController.signal,
    editor: true,
    renderEditorComponent: true,
  });

  await ctx.utils.createWorkspace('test-ws-1');

  await ctx.utils.createNotes(
    [
      ['test-ws-1:one.md', 'hello mars'],
      ['test-ws-1:two.md', 'hello moon'],
    ],
    {
      loadFirst: true,
    },
  );

  return ctx;
}

test('loads the editor and types', async () => {
  const ctx = await setup();

  await render(
    <ctx.ContextProvider>
      <div />
    </ctx.ContextProvider>,
  );

  const element = await screen.findByText(/hello mars/i);

  expect(element).toBeTruthy();

  await ctx.utils.typeText('hello earth ');

  expect(await screen.findByText(/hello earth/i)).toBeTruthy();

  expect(
    ctx.utils.getEditor(PRIMARY_EDITOR_INDEX)?.toHTMLString(),
  ).toMatchInlineSnapshot(`"<p>hello earth hello mars</p>"`);

  const finalSha = await mdToSha('hello earth hello mars');

  await waitForExpect(async () => {
    expect(
      ctx.utils.querySliceState('nsm-slice-file-sha')?.openedFiles,
    ).toMatchObject({
      'test-ws-1:one.md': {
        currentDiskSha: finalSha,
        currentDiskShaTimestamp: undefined,
        lastKnownDiskSha: finalSha,
        pendingWrite: false,
        sha: undefined,
        wsPath: 'test-ws-1:one.md',
      },
    });
  });
});
