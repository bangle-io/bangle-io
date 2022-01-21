import { editorManagerSliceKey } from '@bangle.io/slice-editor-manager';
import { pageSliceKey } from '@bangle.io/slice-page';
import { uiSliceKey } from '@bangle.io/slice-ui';
import { workspaceSliceKey } from '@bangle.io/slice-workspace';
import { workspacesSliceKey } from '@bangle.io/slice-workspaces-manager';
import { naukarProxySliceKey } from '@bangle.io/worker-naukar-proxy';

import { historySliceKey } from '..';
import { bangleStateSlices } from '../bangle-slices';
import { miscEffectsSlice } from '../slices/misc-effects-slice';

test('all slices', () => {
  expect(
    bangleStateSlices({ onUpdate: jest.fn(), extensionSlices: [] }).map(
      (r) => r.key,
    ),
  ).toEqual([
    pageSliceKey.key,
    historySliceKey.key,
    'pageLifeCycleSlice$',
    naukarProxySliceKey.key,
    'worker-setup-slice-storeSyncKey$',
    'store-sync$',
    workspacesSliceKey.key,
    workspaceSliceKey.key,
    'extension-registry-slice$',
    uiSliceKey.key,
    editorManagerSliceKey.key,
    'slice$',
    miscEffectsSlice().key,
    'slice$1',
    'slice$2',
  ]);
});
