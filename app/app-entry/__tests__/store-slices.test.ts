/**
 * @jest-environment @bangle.io/jsdom-env
 */
import { bangleStateSlices } from '@bangle.io/bangle-store';
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
    'worker-setup-slice-storeSyncKey$',
    'store-sync$',
    naukarProxySliceKey.key,
    pageSliceKey.key,
    'history-slice$',
    'pageLifeCycleSlice$',
    'extension-registry-slice$',
    '@bangle.io/slice-storage-provider/slice-key$',
    workspaceSliceKey.key,
    uiSliceKey.key,
    editorManagerSliceKey.key,
    expect.stringMatching(/slice\$/),
    'miscEffectsSlice$',
    'notificationSliceKey$',
    '@bangle.io/slice-editor-collab-comms-key$',
    '@bangle.io/slice-workspace-opened-doc-info/slice-key$',
    expect.stringMatching(/slice\$/),
  ]);
});

test('exhaustive naukar slices list', () => {
  expect(naukarSlices.map((r) => r.key)).toEqual([
    'sync-with-window-stateSyncKey$',
    'store-sync$',
    'extension-registry-slice$',
    '@bangle.io/slice-storage-provider/slice-key$',
    pageSliceKey.key,
    workspaceSliceKey.key,
    'workerEditorSlice$',
    'notificationSliceKey$',
    '@bangle.io/slice-editor-collab-comms-key$',
    '@bangle.io/slice-workspace-opened-doc-info/slice-key$',
    expect.stringMatching(/slice\$/),
  ]);
});

test('slices common worker and main', () => {
  expect(commonInBoth.map((r) => r.key)).toEqual([
    'store-sync$',
    'page-slice$',
    'extension-registry-slice$',
    '@bangle.io/slice-storage-provider/slice-key$',
    'slice-workspace$',
    'notificationSliceKey$',
    '@bangle.io/slice-editor-collab-comms-key$',
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
    '@bangle.io/slice-workspace-opened-doc-info/slice-key$',
  ];

  const sideEffectInWindowOnly = [
    '@bangle.io/slice-editor-collab-comms-key$',
    '@bangle.io/slice-storage-provider/slice-key$',
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

  const slicesExemptFromActionWhitelist = [
    // this slice sync up the stores and its action cannot be whitelisted
    'store-sync$',
    // db slice works sets up indexeddb and it is okay to not sync it across worker and main
    // since indexeddb by default is synced between all threads.
  ];

  test.each(keys.filter((r) => !slicesExemptFromActionWhitelist.includes(r)))(
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
        // expect(
        //   workerSyncWhiteListedActions.some((rule) => action.startsWith(rule)),
        // ).toBe(true);
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
