/**
 * @jest-environment jsdom
 */
import { bangleStateSlices } from '@bangle.io/bangle-store';
import { workerSyncWhiteListedActions } from '@bangle.io/constants';
import { editorManagerSliceKey } from '@bangle.io/slice-editor-manager';
import { pageSliceKey } from '@bangle.io/slice-page';
import { uiSliceKey } from '@bangle.io/slice-ui';
import { workspaceSliceKey } from '@bangle.io/slice-workspace';
import { naukarSlices as getNaukarSlices } from '@bangle.io/worker-naukar';
import { naukarProxySliceKey } from '@bangle.io/worker-naukar-proxy';

const mainSlices = bangleStateSlices({
  onUpdate: jest.fn(),
  extensionSlices: [],
});
const naukarSlices = getNaukarSlices({ onUpdate: jest.fn() });
const commonInBoth = mainSlices.filter((slice) => {
  return naukarSlices.find((n) => n.key === slice.key);
});

test('exhaustive main slices list', () => {
  expect(mainSlices.map((r) => r.key)).toEqual([
    pageSliceKey.key,
    'history-slice$',
    'pageLifeCycleSlice$',
    naukarProxySliceKey.key,
    'worker-setup-slice-storeSyncKey$',
    'store-sync$',
    workspaceSliceKey.key,
    'extension-registry-slice$',
    uiSliceKey.key,
    editorManagerSliceKey.key,
    expect.stringMatching(/slice\$/),
    'miscEffectsSlice$',
    'notificationSliceKey$',
    '@bangle.io/worker-slice-from-naukar-key$',
    '@bangle.io/slice-editor-sync-key$',
    '@bangle.io/slice-workspace-opened-doc-info/slice-key$',
    expect.stringMatching(/e2eHelpers1\$/),
    expect.stringMatching(/e2eHelpers2\$/),
    expect.stringMatching(/slice\$/),
  ]);
});

test('exhaustive naukar slices list', () => {
  expect(naukarSlices.map((r) => r.key)).toEqual([
    'sync-with-window-stateSyncKey$',
    'store-sync$',
    'extension-registry-slice$',
    pageSliceKey.key,
    workspaceSliceKey.key,
    'workerEditorSlice$',
    'notificationSliceKey$',
    'write-note-to-disk-key$',
    '@bangle.io/slice-editor-sync-key$',
    '@bangle.io/worker-slice-from-naukar-key$',
    '@bangle.io/slice-workspace-opened-doc-info/slice-key$',
    expect.stringMatching(/slice\$/),
  ]);
});

test('slices common worker and main', () => {
  expect(commonInBoth.map((r) => r.key)).toEqual([
    'page-slice$',
    'store-sync$',
    'slice-workspace$',
    'extension-registry-slice$',
    'notificationSliceKey$',
    '@bangle.io/worker-slice-from-naukar-key$',
    '@bangle.io/slice-editor-sync-key$',
    '@bangle.io/slice-workspace-opened-doc-info/slice-key$',
  ]);
});

describe('worker and window constraints', () => {
  const sideEffectInBoth = ['store-sync$'];
  const sideEffectInWorkerOnly = [
    'page-slice$',
    'store-sync$',
    'slice-workspace$',
    'extension-registry-slice$',
    'notificationSliceKey$',
  ];

  const sideEffectInWindowOnly = [
    '@bangle.io/slice-editor-sync-key$',
    '@bangle.io/slice-workspace-opened-doc-info/slice-key$',
    '@bangle.io/worker-slice-from-naukar-key$',
  ];

  const keys = commonInBoth.map((r) => r.key);

  // test to make sure side-effects only run at one place - workers
  // unless noted.
  test.each(keys)(
    `%# slice %s must have side effects disabled in window and enabled in worker`,
    (sliceKeyName) => {
      const slice = mainSlices.find((r) => r.key === sliceKeyName);
      const naukarSlice = naukarSlices.find((r) => r.key === sliceKeyName);

      expect(slice).toBeTruthy();
      expect(naukarSlice).toBeTruthy();

      const hasSideEffectInWindow = slice!.spec.sideEffect;
      const hasSideEffectInWorker = naukarSlice!.spec.sideEffect;

      // if there are side effects, they should only be defined in worker
      // and not main window and similary for other cases
      if (hasSideEffectInWindow && hasSideEffectInWorker) {
        // eslint-disable-next-line jest/no-conditional-expect
        expect(sideEffectInBoth).toContain(sliceKeyName);
      } else if (hasSideEffectInWindow && !hasSideEffectInWorker) {
        // eslint-disable-next-line jest/no-conditional-expect
        expect(sideEffectInWindowOnly).toContain(sliceKeyName);
      } else if (!hasSideEffectInWindow && hasSideEffectInWorker) {
        // eslint-disable-next-line jest/no-conditional-expect
        expect(sideEffectInWorkerOnly).toContain(sliceKeyName);
      }
    },
  );

  test.each(keys.filter((r) => r !== 'store-sync$'))(
    `%# slice %s actions must be white listed for sync`,
    (sliceKeyName) => {
      const slice = mainSlices.find((r) => r.key === sliceKeyName);
      const naukarSlice = naukarSlices.find((r) => r.key === sliceKeyName);

      if (
        !slice ||
        slice?.spec.actions == undefined ||
        naukarSlice?.spec.actions == undefined
      ) {
        throw new Error('Action serializers must be defined');
      }

      // since slices are instantiated from same class, their specification should be
      // identical
      expect(Object.keys(slice.spec.actions)).toEqual(
        Object.keys(naukarSlice.spec.actions),
      );

      for (const action of Object.keys(naukarSlice.spec.actions)) {
        // the action must pass through the sync filter or else states will not be kept
        // in sync.
        expect(
          workerSyncWhiteListedActions.some((rule) => action.startsWith(rule)),
        ).toBe(true);
      }
    },
  );
});

test('extension-registry-slice should not have side effects', () => {
  const sliceKeyName = 'extension-registry-slice$';
  const slice = mainSlices.find((r) => r.key === sliceKeyName);
  const naukarSlice = naukarSlices.find((r) => r.key === sliceKeyName);

  expect(slice).toBeTruthy();
  expect(naukarSlice).toBeTruthy();
  expect(slice!.spec.sideEffect).toBeUndefined();
  expect(naukarSlice!.spec.sideEffect).toBeUndefined();
});
