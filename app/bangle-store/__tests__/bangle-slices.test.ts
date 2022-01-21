import { editorManagerSliceKey } from '@bangle.io/slice-editor-manager';
import { pageSliceKey } from '@bangle.io/slice-page';
import { uiSliceKey } from '@bangle.io/slice-ui';
import { workspaceSliceKey } from '@bangle.io/slice-workspace';
import { workspacesSliceKey } from '@bangle.io/slice-workspaces-manager';
import { naukarProxySliceKey } from '@bangle.io/worker-naukar-proxy';

import { bangleStateSlices } from '../bangle-slices';
import { miscEffectsSlice } from '../slices/misc-effects-slice';

const mainSlices = bangleStateSlices({
  onUpdate: jest.fn(),
  extensionSlices: [],
});

test('exhaustive slices list', () => {
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
    miscEffectsSlice().key,
    expect.stringMatching(/slice\$/),
    expect.stringMatching(/slice\$/),
  ]);
});

test('side effects disabled for pageLifeCycle', () => {
  const slice = mainSlices.find((r) => r.key === pageSliceKey.key);
  expect(slice).toBeTruthy();
  expect(slice?.spec.sideEffect).toBeUndefined();
});

test('side effects disabled for workspacesSlice', () => {
  const slice = mainSlices.find((r) => r.key === workspacesSliceKey.key);
  expect(slice).toBeTruthy();
  expect(slice?.spec.sideEffect).toBeUndefined();
});

test('side effects disabled for workspaceSlice', () => {
  const slice = mainSlices.find((r) => r.key === workspaceSliceKey.key);
  expect(slice).toBeTruthy();
  expect(slice?.spec.sideEffect).toBeUndefined();
});
