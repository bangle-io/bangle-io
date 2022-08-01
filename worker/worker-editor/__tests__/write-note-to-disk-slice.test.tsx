/**
 * @jest-environment jsdom
 */
import { act, render } from '@testing-library/react';
import React from 'react';

import { PRIMARY_EDITOR_INDEX } from '@bangle.io/constants';
import type { SliceSideEffect } from '@bangle.io/create-store';
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
  await sleep(5);
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
    effects.writeToDiskEffect,
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
      const { store, typeText, wsPath1 } = await setup({
        providedEffects: [effects.writeToDiskEffect],
      });
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

      const docInfo = getOpenedDocInfo()(store.state)[wsPath1];

      expect(docInfo).toEqual({
        currentDiskSha: 'cc1f078bfb2a1127991cd52a77708dfd860ba586',
        lastKnownDiskSha: 'cc1f078bfb2a1127991cd52a77708dfd860ba586',
        pendingWrite: false,
        wsPath: wsPath1,
      });

      typeText(PRIMARY_EDITOR_INDEX, 'more ', 0);

      await sleep(10);

      expect(
        getEditor(PRIMARY_EDITOR_INDEX)(store.state)?.toHTMLString(),
      ).toMatchInlineSnapshot(`"<p>more </p><h1>bye hello mars</h1>"`);

      expect(getOpenedDocInfo()(store.state)[wsPath1]).toEqual({
        currentDiskSha: '0c980342a685a642d17d2d70dcd112a444dd2c14',
        lastKnownDiskSha: '0c980342a685a642d17d2d70dcd112a444dd2c14',
        pendingWrite: false,
        wsPath: wsPath1,
      });
    });

    test('updates the queue while another item is being processed', async () => {
      let resolveArray: Array<(v: string) => void> = [];

      cachedCalculateGitFileShaSpy.mockImplementation(() => {
        return new Promise((res, rej) => {
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

  describe('calculateLastKnownDiskShaEffect', () => {
    test('should set sha', async () => {
      const { store, wsPath1 } = await setup({
        providedEffects: [effects.calculateLastKnownDiskShaEffect],
      });

      const docInfo = getOpenedDocInfo()(store.state)[wsPath1];

      expect(docInfo).toEqual({
        pendingWrite: expect.any(Boolean),
        wsPath: wsPath1,
        lastKnownDiskSha: '7be9985c422e362ccf92a083494a0b72c7c99fd2',
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
        currentDiskSha: '7be9985c422e362ccf92a083494a0b72c7c99fd2',
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

      // shas should go out of sync
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
  });
});
