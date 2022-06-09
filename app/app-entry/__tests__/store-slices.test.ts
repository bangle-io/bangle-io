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
    expect.stringMatching(/slice\$/),
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
  ]);
});

describe('worker and window constraints', () => {
  const fixture = commonInBoth
    .map((r) => r.key)
    .filter(
      (r) =>
        // store sync needs effect to be runing in both places worker and window, so
        // we remove it from tests
        r !== 'store-sync$',
    );

  // test to make sure side-effects only run at one place - workers
  // unless noted.
  test.each(fixture)(
    `%# slice %s must have side effects disabled in window and enabled in worker`,
    (sliceKeyName) => {
      const slice = mainSlices.find((r) => r.key === sliceKeyName);
      const naukarSlice = naukarSlices.find((r) => r.key === sliceKeyName);

      expect(slice).toBeTruthy();
      expect(naukarSlice).toBeTruthy();

      const hasSideEffectInWindow = slice!.spec.sideEffect;
      const hasSideEffectInWorker = naukarSlice!.spec.sideEffect;

      // if there are side effects, they should only be defined in worker
      // and not main window
      if (hasSideEffectInWindow || hasSideEffectInWorker) {
        // eslint-disable-next-line jest/no-conditional-expect
        expect(hasSideEffectInWindow).toBeUndefined();
        // eslint-disable-next-line jest/no-conditional-expect
        expect(hasSideEffectInWorker).toBeTruthy();
      }
    },
  );

  test.each(fixture)(
    `%# slice %s actions must be white listed for sync`,
    (sliceKeyName) => {
      const slice = mainSlices.find((r) => r.key === sliceKeyName);
      const naukarSlice = naukarSlices.find((r) => r.key === sliceKeyName);

      if (
        !slice ||
        slice?.spec.actions == undefined ||
        naukarSlice?.spec.actions == undefined
      ) {
        throw new Error('Actions must be defined');
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
