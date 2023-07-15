import type { nsmExtensionRegistry } from '@bangle.io/extension-registry';
import { InferSliceNameFromSlice, Store } from '@bangle.io/nsm-3';
import type { nsmSliceWorkspace } from '@bangle.io/nsm-slice-workspace';
import { closeIfFound } from '@bangle.io/nsm-slice-workspace';
import type { nsmEditorManagerSlice } from '@bangle.io/slice-editor-manager';
import type { nsmPageSlice } from '@bangle.io/slice-page';
import type { nsmUISlice } from '@bangle.io/slice-ui';
import { createWsPath } from '@bangle.io/ws-path';

test('typing catches missing slice', () => {
  // intentionally omit page slice
  type FaultySliceName =
    | InferSliceNameFromSlice<typeof nsmUISlice>
    | InferSliceNameFromSlice<typeof nsmEditorManagerSlice>
    // | InferSliceNameFromSlice<typeof nsmPageSlice>
    | InferSliceNameFromSlice<typeof nsmSliceWorkspace>
    | InferSliceNameFromSlice<typeof nsmExtensionRegistry>;

  type CorrectSliceName =
    | InferSliceNameFromSlice<typeof nsmUISlice>
    | InferSliceNameFromSlice<typeof nsmEditorManagerSlice>
    | InferSliceNameFromSlice<typeof nsmPageSlice>
    | InferSliceNameFromSlice<typeof nsmSliceWorkspace>
    | InferSliceNameFromSlice<typeof nsmExtensionRegistry>;
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  () => {
    const store1: Store<FaultySliceName> = {} as any;
    const store2: Store<CorrectSliceName> = {} as any;

    const wsPath = createWsPath('ws:test-1.md');
    store1.dispatch(closeIfFound(wsPath));
    store2.dispatch(closeIfFound(wsPath));
  };

  expect(1).toBe(1);
});
