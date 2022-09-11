/**
 * @jest-environment @bangle.io/jsdom-env
 */
import { render, waitFor } from '@testing-library/react';
import React from 'react';

import { PRIMARY_EDITOR_INDEX } from '@bangle.io/constants';
import type { SliceSideEffect } from '@bangle.io/create-store';
import { Editor } from '@bangle.io/editor';
import { calculateGitFileSha } from '@bangle.io/remote-file-sync';
import { getEditor } from '@bangle.io/slice-editor-manager';
import { getNote, writeNote } from '@bangle.io/slice-workspace';
import { getOpenedDocInfo } from '@bangle.io/slice-workspace-opened-doc-info';
import {
  createPMNode,
  setupMockMessageChannel,
  setupMockWorkspaceWithNotes,
  TestStoreProvider,
  waitForExpect,
} from '@bangle.io/test-utils';
import { sleep } from '@bangle.io/utils';

import type { CollabStateInfo } from '../common';
import { writeNoteToDiskSliceKey } from '../common';
import { cachedCalculateGitFileSha } from '../helpers';
import * as effects from '../write-note-to-disk-slice-effects';
import { setup as commonSetup } from './test-helpers';

type SlideEffect = SliceSideEffect<any, any>;

jest.mock('../common', () => {
  const actual = jest.requireActual('../common');

  return {
    ...actual,
    DISK_SHA_CHECK_INTERVAL: 2,
  };
});

jest.mock('../helpers', () => {
  const actual = jest.requireActual('../helpers');

  return {
    ...actual,
    cachedCalculateGitFileSha: jest.fn(),
  };
});

let originalConsoleWarn = console.warn;
let cleanup = () => {};

const cachedCalculateGitFileShaSpy = jest.mocked(cachedCalculateGitFileSha);

beforeEach(() => {
  console.warn = jest.fn();
  cachedCalculateGitFileShaSpy.mockReset();
  cachedCalculateGitFileShaSpy.mockImplementation((...args) => {
    return jest.requireActual('../helpers').cachedCalculateGitFileSha(...args);
  });

  cleanup = setupMockMessageChannel();
});

afterEach(async () => {
  cleanup();
  // allow for promises to resolve before we stop the store
  await sleep(20);
  await sleep(10);
  console.warn = originalConsoleWarn;
});

const makeEffectsArray = ({
  disabledStaleDocEffect,
}: {
  disabledStaleDocEffect?: boolean;
} = {}): SlideEffect[] => {
  const allEffects = [
    effects.blockOnPendingWriteEffect,
    effects.calculateCurrentDiskShaEffect,
    effects.calculateLastKnownDiskShaEffect,
    !disabledStaleDocEffect && effects.staleDocEffect,
  ];

  return allEffects.filter((r): r is SlideEffect => Boolean(r));
};

const setup = async ({
  // either use providedEffects or use the shorthand options
  providedEffects = makeEffectsArray(),
}: {
  providedEffects?: SlideEffect[];
} = {}) => {
  const wsName = 'my-ws-' + Math.random();
  const obj = await commonSetup({
    writeNoteToDiskEffects: providedEffects,
  });
  const wsPath1 = `${wsName}:test-dir/magic.md`;

  await setupMockWorkspaceWithNotes(obj.store, wsName, [
    [wsPath1, `# hello mars`],
  ]);

  let { container } = render(
    <TestStoreProvider
      editorManagerContextProvider
      bangleStore={obj.store}
      bangleStoreChanged={0}
    >
      <Editor
        editorId={PRIMARY_EDITOR_INDEX}
        wsPath={wsPath1}
        className="test-class"
        extensionRegistry={obj.extensionRegistry}
      />
    </TestStoreProvider>,
  );
  await waitFor(() => {
    expect(container.innerHTML).toContain('hello mars');
  });

  await waitFor(() => {
    // wait for collab to be ready
    expect(container.querySelector('.bangle-collab-active')).toBeInstanceOf(
      HTMLElement,
    );
  });

  return { ...obj, wsPath1, wsName, getContainer: () => container };
};

const mdToSha = (md: string) => {
  return calculateGitFileSha(
    new File([new Blob([md], { type: 'text/plain' })], 'test.md'),
  );
};

describe('effects', () => {
  describe('writeToDiskEffect', () => {
    test('writes to disk', async () => {
      const { store, typeText, wsPath1, getContainer } = await setup({
        providedEffects: [],
      });
      expect(
        getEditor(PRIMARY_EDITOR_INDEX)(store.state)?.toHTMLString(),
      ).toMatchInlineSnapshot(`"<h1>hello mars</h1>"`);

      await typeText(PRIMARY_EDITOR_INDEX, 'bye ');

      await waitFor(() => {
        expect(getContainer().innerHTML).toContain('bye hello mars');
      });

      await waitForExpect(async () => {
        expect(
          (
            await getNote(wsPath1)(store.state, store.dispatch, store)
          )?.toString(),
        ).toEqual(`doc(heading("bye hello mars"))`);
      });

      const docInfo = getOpenedDocInfo()(store.state)[wsPath1];

      expect(docInfo).toEqual({
        currentDiskSha: await mdToSha(`# bye hello mars`),
        lastKnownDiskSha: await mdToSha(`# bye hello mars`),
        pendingWrite: false,
        wsPath: wsPath1,
      });

      await typeText(PRIMARY_EDITOR_INDEX, 'more ', 0);

      await waitForExpect(() =>
        expect(
          getEditor(PRIMARY_EDITOR_INDEX)(store.state)?.toHTMLString(),
        ).toEqual(`<p>more </p><h1>bye hello mars</h1>`),
      );

      await waitForExpect(async () =>
        expect(getOpenedDocInfo()(store.state)[wsPath1]).toEqual({
          currentDiskSha: await mdToSha('more \n\n# bye hello mars'),
          lastKnownDiskSha: await mdToSha('more \n\n# bye hello mars'),
          pendingWrite: false,
          wsPath: wsPath1,
        }),
      );
    });
  });

  describe('calculateLastKnownDiskShaEffect', () => {
    test('should set sha', async () => {
      const { store, wsPath1 } = await setup({
        providedEffects: [effects.calculateLastKnownDiskShaEffect],
      });

      const docInfo = getOpenedDocInfo()(store.state)[wsPath1];

      expect(docInfo).toEqual({
        pendingWrite: expect.any(Boolean),
        wsPath: wsPath1,
        lastKnownDiskSha: await mdToSha('# hello mars'),
      });
    });
  });

  describe('calculateCurrentDiskShaEffect', () => {
    test('should set sha', async () => {
      const { store, wsPath1 } = await setup({
        providedEffects: [effects.calculateCurrentDiskShaEffect],
      });

      const docInfo = getOpenedDocInfo()(store.state)[wsPath1];

      expect(docInfo).toEqual({
        pendingWrite: expect.any(Boolean),
        wsPath: wsPath1,
        currentDiskSha: await mdToSha('# hello mars'),
      });
    });

    test('should keep polling disk for staleness', async () => {
      const { store, typeText, wsPath1 } = await setup({
        // if not disabled lastKnownDiskSha and currentDiskSha will
        // be made equal by `stateDocEffect`, preventing us from
        // testing effectively.
        providedEffects: makeEffectsArray({ disabledStaleDocEffect: true }),
      });
      expect(
        getEditor(PRIMARY_EDITOR_INDEX)(store.state)?.toHTMLString(),
      ).toMatchInlineSnapshot(`"<h1>hello mars</h1>"`);

      await typeText(PRIMARY_EDITOR_INDEX, 'bye ');

      await sleep(10);

      const originalSha = await mdToSha('# bye hello mars');

      await waitForExpect(() => {
        const docInfo = getOpenedDocInfo()(store.state)[wsPath1];
        expect(docInfo?.currentDiskSha).toEqual(originalSha);
      });
      const docInfo = getOpenedDocInfo()(store.state)[wsPath1];
      expect(docInfo?.lastKnownDiskSha).toEqual(originalSha);

      // write a new note to make the current doc in memory stale
      await writeNote(wsPath1, createPMNode([], 'my thing'))(
        store.state,
        store.dispatch,
        store,
      );

      await waitForExpect(async () => {
        // shas should go out of sync
        const newDocInfo = getOpenedDocInfo()(store.state)[wsPath1];
        expect(newDocInfo?.currentDiskSha).toEqual(await mdToSha('my thing'));
      });

      const newDocInfo = getOpenedDocInfo()(store.state)[wsPath1];
      expect(newDocInfo?.lastKnownDiskSha).toEqual(originalSha);
    });
  });

  describe('staleDocEffect', () => {
    test('resets to whats on disk', async () => {
      const { store, typeText, wsPath1 } = await setup({});
      expect(
        getEditor(PRIMARY_EDITOR_INDEX)(store.state)?.toHTMLString(),
      ).toMatchInlineSnapshot(`"<h1>hello mars</h1>"`);

      await typeText(PRIMARY_EDITOR_INDEX, 'bye ');

      await sleep(10);

      const originalSha = await mdToSha('# bye hello mars');

      await waitForExpect(() => {
        const docInfo = getOpenedDocInfo()(store.state)[wsPath1];

        expect(docInfo?.currentDiskSha).toEqual(originalSha);
      });

      expect(
        getEditor(PRIMARY_EDITOR_INDEX)(store.state)?.toHTMLString(),
      ).toMatchInlineSnapshot(`"<h1>bye hello mars</h1>"`);

      // write a new note to make the current doc in memory stale
      await writeNote(wsPath1, createPMNode([], 'overwrite'))(
        store.state,
        store.dispatch,
        store,
      );

      await sleep(10);

      await waitForExpect(() =>
        expect(
          getEditor(PRIMARY_EDITOR_INDEX)(store.state)?.toHTMLString(),
        ).toBe(`<p>overwrite</p>`),
      );

      const newDocInfo = getOpenedDocInfo()(store.state)[wsPath1];
      // shas should be the same as we have loaded the file
      // that we just wrote on disk.
      expect(newDocInfo?.currentDiskSha).toEqual(await mdToSha('overwrite'));
      expect(newDocInfo?.lastKnownDiskSha).toEqual(await mdToSha('overwrite'));
    });
  });

  test('blockOnPendingWriteEffect', async () => {
    const { store, typeText, getAction } = await setup();

    await waitForExpect(() =>
      expect(getEditor(PRIMARY_EDITOR_INDEX)(store.state)?.toHTMLString()).toBe(
        '<h1>hello mars</h1>',
      ),
    );

    await typeText(PRIMARY_EDITOR_INDEX, 'hello');

    await waitForExpect(() => {
      // first block and then unblock
      expect(
        getAction('action::@bangle.io/slice-page:BLOCK_RELOAD').map(
          (r) => r.value,
        ),
      ).toEqual([
        {
          block: true,
        },
        {
          block: false,
        },
      ]);
    });
  });
});
