/**
 * @jest-environment jsdom
 */
import { act, render } from '@testing-library/react';
import React from 'react';

import { PRIMARY_EDITOR_INDEX } from '@bangle.io/constants';
import { Editor } from '@bangle.io/editor';
import { getEditor } from '@bangle.io/slice-editor-manager';
import { getNote, writeNote } from '@bangle.io/slice-workspace';
import { getOpenedDocInfo } from '@bangle.io/slice-workspace-opened-doc-info';
import {
  createPMNode,
  setupMockMessageChannel,
  setupMockWorkspaceWithNotes,
  TestStoreProvider,
} from '@bangle.io/test-utils';
import { sleep } from '@bangle.io/utils';

import { writeNoteToDiskSliceKey } from '../common';
import { cachedCalculateGitFileSha } from '../helpers';
import { queueWrite } from '../write-note-to-disk-slice';
import { staleDocEffect } from '../write-note-to-disk-slice-effects';
import { setup as commonSetup } from './test-helpers';

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

jest.mock('../write-note-to-disk-slice-effects', () => {
  const actual = jest.requireActual('../write-note-to-disk-slice-effects');

  return {
    ...actual,
    writeToDiskEffect: jest.fn(actual.writeToDiskEffect),
    calculateCurrentDiskShaEffect: jest.fn(
      actual.calculateCurrentDiskShaEffect,
    ),
    staleDocEffect: jest.fn(actual.staleDocEffect),
    blockOnPendingWriteEffect: jest.fn(actual.blockOnPendingWriteEffect),
  };
});

let originalConsoleWarn = console.warn;
let cleanup = () => {};

const cachedCalculateGitFileShaSpy = jest.mocked(cachedCalculateGitFileSha);
const staleDocEffectSpy = jest.mocked(staleDocEffect);
beforeEach(() => {
  console.warn = jest.fn();
  cachedCalculateGitFileShaSpy.mockImplementation((...args) => {
    return jest.requireActual('../helpers').cachedCalculateGitFileSha(...args);
  });

  staleDocEffectSpy.mockImplementation((...args) => {
    return jest
      .requireActual('../write-note-to-disk-slice-effects')
      .staleDocEffect(...args);
  });

  cleanup = setupMockMessageChannel();
});

afterEach(async () => {
  cleanup();
  await sleep(5);
  console.warn = originalConsoleWarn;
});

const setup = async ({
  disableStaleEffectDoc,
}: { disableStaleEffectDoc?: boolean } = {}) => {
  if (disableStaleEffectDoc) {
    jest.mocked(staleDocEffect).mockImplementation(
      writeNoteToDiskSliceKey.effect(() => {
        return {};
      }),
    );
  }

  const wsName = 'my-ws-' + Math.random();
  const obj = await commonSetup({});
  const wsPath1 = `${wsName}:test-dir/magic.md`;

  await setupMockWorkspaceWithNotes(obj.store, wsName, [
    [wsPath1, `# hello mars`],
  ]);

  let result;
  act(() => {
    result = render(
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
  });

  await act(() => {
    return sleep(0);
  });
  await sleep(0);

  return { ...obj, wsPath1, wsName };
};

describe('effects', () => {
  describe('writeToDiskEffect', () => {
    test('writes to disk', async () => {
      const { store, typeText, wsPath1 } = await setup();
      expect(
        getEditor(PRIMARY_EDITOR_INDEX)(store.state)?.toHTMLString(),
      ).toMatchInlineSnapshot(`"<h1>hello mars</h1>"`);

      typeText(PRIMARY_EDITOR_INDEX, 'bye ');

      await sleep(10);

      expect(
        (
          await getNote(wsPath1)(store.state, store.dispatch, store)
        )?.toString(),
      ).toMatchInlineSnapshot(`"doc(heading(\\"bye hello mars\\"))"`);
    });

    test('updates the queue while another item is being processed', async () => {
      let resolveArray: Array<(v: string) => void> = [];

      cachedCalculateGitFileShaSpy.mockImplementation(() => {
        return new Promise((res) => {
          resolveArray.push(res);
        });
      });

      const { store, typeText, wsPath1, wsName } = await setup();
      expect(
        getEditor(PRIMARY_EDITOR_INDEX)(store.state)?.toHTMLString(),
      ).toMatchInlineSnapshot(`"<h1>hello mars</h1>"`);

      typeText(PRIMARY_EDITOR_INDEX, 'bye ');
      await sleep(0);

      const docInfo = getOpenedDocInfo()(store.state)[wsPath1];

      expect(docInfo?.pendingWrite).toBe(true);

      const item1 = {
        wsPath: `${wsName}:some-doc.md`,
        collabState: {
          doc: createPMNode([], `hi I am dummy`),
          steps: [],
          version: 0,
        },
      };

      const item2 = {
        wsPath: `${wsName}:some-other-1.md`,
        collabState: {
          doc: createPMNode([], `test-1`),
          steps: [],
          version: 0,
        },
      };
      queueWrite(item1)(store.state, store.dispatch);
      queueWrite(item2)(store.state, store.dispatch);

      await sleep(0);

      // item waits in the queue
      expect(
        writeNoteToDiskSliceKey.getSliceStateAsserted(store.state).writeQueue,
      ).toEqual([item1, item2]);

      // modifying the document should update the item in queue
      const item1Modified = {
        wsPath: `${wsName}:some-doc.md`,
        collabState: {
          doc: createPMNode([], `hi I am dummy modified`),
          steps: [],
          version: 1,
        },
      };

      queueWrite(item1Modified)(store.state, store.dispatch);

      expect(
        writeNoteToDiskSliceKey.getSliceStateAsserted(store.state).writeQueue,
      ).toEqual([item1Modified, item2]);

      const item2Modified = {
        wsPath: `${wsName}:some-other-1.md`,
        collabState: {
          doc: createPMNode([], `test-1 hey modified`),
          steps: [],
          version: 3,
        },
      };

      queueWrite(item2Modified)(store.state, store.dispatch);

      expect(
        writeNoteToDiskSliceKey.getSliceStateAsserted(store.state).writeQueue,
      ).toEqual([item1Modified, item2Modified]);

      // start resolving promises
      resolveArray.forEach((resolve) => resolve('some-sha'));

      await sleep(0);

      expect(
        writeNoteToDiskSliceKey.getSliceStateAsserted(store.state).writeQueue,
      ).toEqual([item2Modified]);

      resolveArray.forEach((resolve) => resolve('some-sha'));

      await sleep(0);

      expect(
        writeNoteToDiskSliceKey.getSliceStateAsserted(store.state).writeQueue,
      ).toEqual([]);

      // writes correctly
      expect(
        (
          await getNote(item1.wsPath)(store.state, store.dispatch, store)
        )?.toString(),
      ).toMatchInlineSnapshot(`"doc(paragraph(\\"hi I am dummy modified\\"))"`);

      expect(
        (
          await getNote(item2.wsPath)(store.state, store.dispatch, store)
        )?.toString(),
      ).toMatchInlineSnapshot(`"doc(paragraph(\\"test-1 hey modified\\"))"`);
    });
  });

  describe('calculateCurrentDiskShaEffect', () => {
    test('should update shas on write', async () => {
      const { store, typeText, wsPath1 } = await setup();
      expect(
        getEditor(PRIMARY_EDITOR_INDEX)(store.state)?.toHTMLString(),
      ).toMatchInlineSnapshot(`"<h1>hello mars</h1>"`);

      typeText(PRIMARY_EDITOR_INDEX, 'bye ');

      await sleep(10);

      const docInfo = getOpenedDocInfo()(store.state)[wsPath1];

      expect(docInfo).toEqual({
        pendingWrite: expect.any(Boolean),
        currentDiskShaTimestamp: expect.any(Number),
        wsPath: wsPath1,
        currentDiskSha: 'cc1f078bfb2a1127991cd52a77708dfd860ba586',
        lastKnownDiskSha: 'cc1f078bfb2a1127991cd52a77708dfd860ba586',
      });

      typeText(PRIMARY_EDITOR_INDEX, 'more stuff ', 1);

      await sleep(0);

      expect(
        getEditor(PRIMARY_EDITOR_INDEX)(store.state)?.toHTMLString(),
      ).toEqual('<h1>more stuff bye hello mars</h1>');

      await sleep(0);

      const newDocInfo = getOpenedDocInfo()(store.state)[wsPath1];

      expect(newDocInfo).toEqual({
        pendingWrite: expect.any(Boolean),
        currentDiskShaTimestamp: expect.any(Number),
        wsPath: wsPath1,
        currentDiskSha: 'b5dc6dde7430c7eae5e337e18d09940329ee2379',
        lastKnownDiskSha: 'b5dc6dde7430c7eae5e337e18d09940329ee2379',
      });

      expect(docInfo?.currentDiskSha).not.toBe(newDocInfo?.currentDiskSha);
      expect(docInfo?.lastKnownDiskSha).not.toBe(newDocInfo?.lastKnownDiskSha);

      store.destroy();
    });

    test('should keep polling disk for staleness', async () => {
      const { store, typeText, wsPath1 } = await setup({
        // if not disabled lastKnownDiskSha and currentDiskSha will
        // be made equal by `stateDocEffect`, preventing us from
        // testing effectively.
        disableStaleEffectDoc: true,
      });
      expect(
        getEditor(PRIMARY_EDITOR_INDEX)(store.state)?.toHTMLString(),
      ).toMatchInlineSnapshot(`"<h1>hello mars</h1>"`);

      typeText(PRIMARY_EDITOR_INDEX, 'bye ');

      await sleep(10);

      const docInfo = getOpenedDocInfo()(store.state)[wsPath1];

      const originalSha = 'cc1f078bfb2a1127991cd52a77708dfd860ba586';

      expect(docInfo?.currentDiskSha).toEqual(originalSha);
      expect(docInfo?.lastKnownDiskSha).toEqual(originalSha);

      // write a new note to make the current doc in memory stale
      await writeNote(wsPath1, createPMNode([], 'my thing'))(
        store.state,
        store.dispatch,
        store,
      );

      await sleep(5);

      const newDocInfo = getOpenedDocInfo()(store.state)[wsPath1];

      expect(newDocInfo?.currentDiskSha).toEqual(
        'e3c742401a3b742c7849106b83f72f0063581c4f',
      );
      expect(newDocInfo?.lastKnownDiskSha).toEqual(originalSha);
    });
  });

  describe('staleDocEffect', () => {
    test('resets to whats on disk', async () => {
      const { store, typeText, wsPath1 } = await setup({});
      expect(
        getEditor(PRIMARY_EDITOR_INDEX)(store.state)?.toHTMLString(),
      ).toMatchInlineSnapshot(`"<h1>hello mars</h1>"`);

      typeText(PRIMARY_EDITOR_INDEX, 'bye ');

      await sleep(10);

      const docInfo = getOpenedDocInfo()(store.state)[wsPath1];

      const originalSha = 'cc1f078bfb2a1127991cd52a77708dfd860ba586';

      expect(docInfo?.currentDiskSha).toEqual(originalSha);
      expect(docInfo?.lastKnownDiskSha).toEqual(originalSha);

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

      const newDocInfo = getOpenedDocInfo()(store.state)[wsPath1];

      // shas should be the same as we have loaded the file
      // that we just wrote on disk.
      expect(newDocInfo?.currentDiskSha).toEqual(
        '50755dab75e4b9ac0f74fc5707827ec14ebfe6c0',
      );
      expect(newDocInfo?.lastKnownDiskSha).toEqual(
        '50755dab75e4b9ac0f74fc5707827ec14ebfe6c0',
      );

      expect(
        getEditor(PRIMARY_EDITOR_INDEX)(store.state)?.toHTMLString(),
      ).toMatchInlineSnapshot(`"<p>overwrite</p>"`);
    });
  });

  test('blockOnPendingWriteEffect', async () => {
    const { store, typeText, getAction } = await setup();
    expect(
      getEditor(PRIMARY_EDITOR_INDEX)(store.state)?.toHTMLString(),
    ).toMatchInlineSnapshot(`"<h1>hello mars</h1>"`);

    typeText(PRIMARY_EDITOR_INDEX, 'hello');

    await sleep(10);

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

    store.destroy();
  });
});
