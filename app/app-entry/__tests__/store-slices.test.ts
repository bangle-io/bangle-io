/**
 * @jest-environment jsdom
 */
import { bangleStateSlices } from '@bangle.io/bangle-store';
import { editorManagerSliceKey } from '@bangle.io/slice-editor-manager';
import { pageSliceKey } from '@bangle.io/slice-page';
import { uiSliceKey } from '@bangle.io/slice-ui';
import { workspaceSliceKey } from '@bangle.io/slice-workspace';
import { workspacesSliceKey } from '@bangle.io/slice-workspaces-manager';
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
    workspacesSliceKey.key,
    workspaceSliceKey.key,
    'extension-registry-slice$',
    uiSliceKey.key,
    editorManagerSliceKey.key,
    expect.stringMatching(/slice\$/),
    'miscEffectsSlice$',
    expect.stringMatching(/slice\$/),
    expect.stringMatching(/slice\$/),
  ]);
});

test('exhaustive naukar slices list', () => {
  expect(naukarSlices.map((r) => r.key)).toEqual([
    'sync-with-window-stateSyncKey$',
    'store-sync$',
    pageSliceKey.key,
    workspacesSliceKey.key,
    workspaceSliceKey.key,
    'editorCollabSlice$',
    expect.stringMatching(/slice\$/),
  ]);
});

test('slices common worker and main', () => {
  expect(commonInBoth.map((r) => r.key)).toEqual([
    'page-slice$',
    'store-sync$',
    'slice-workspaces-manager$',
    'slice-workspace$',
  ]);
});

// test to make sure identical sideEffects aren't running
test.each(
  commonInBoth
    .map((r) => r.key)
    // store sync needs effect in both places so filter out
    .filter((r) => r !== 'store-sync$'),
)(
  `%# %s side effect disabled in main and enabled in worker`,
  (sliceKeyName) => {
    const slice = mainSlices.find((r) => r.key === sliceKeyName);
    const naukarSlice = naukarSlices.find((r) => r.key === sliceKeyName);

    expect(slice).toBeTruthy();
    expect(naukarSlice).toBeTruthy();

    expect(slice!.spec.sideEffect).toBeUndefined();
    expect(naukarSlice!.spec.sideEffect).toBeTruthy();
  },
);
