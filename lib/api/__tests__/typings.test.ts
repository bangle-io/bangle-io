import type { nsmExtensionRegistry } from '@bangle.io/extension-registry';
import type { InferSliceName, Store } from '@bangle.io/nsm';
import type { nsmSliceWorkspace } from '@bangle.io/nsm-slice-workspace';
import { closeIfFound } from '@bangle.io/nsm-slice-workspace';
import type { nsmEditorManagerSlice } from '@bangle.io/slice-editor-manager';
import type { nsmPageSlice } from '@bangle.io/slice-page';
import type { nsmUISlice } from '@bangle.io/slice-ui';
import { createWsPath } from '@bangle.io/ws-path';

test('typing catches missing slice', () => {
  // intentionally omit page slice
  type FaultySliceName =
    | InferSliceName<typeof nsmUISlice>
    | InferSliceName<typeof nsmEditorManagerSlice>
    // | InferSliceName<typeof nsmPageSlice>
    | InferSliceName<typeof nsmSliceWorkspace>
    | InferSliceName<typeof nsmExtensionRegistry>;

  type CorrectSliceName =
    | InferSliceName<typeof nsmUISlice>
    | InferSliceName<typeof nsmEditorManagerSlice>
    | InferSliceName<typeof nsmPageSlice>
    | InferSliceName<typeof nsmSliceWorkspace>
    | InferSliceName<typeof nsmExtensionRegistry>;
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  () => {
    const store1: Store<FaultySliceName> = {} as any;
    const store2: Store<CorrectSliceName> = {} as any;

    const wsPath = createWsPath('ws:test-1.md');
    // @ts-expect-error - should be caught as page slice is missing
    store1.dispatch(closeIfFound(store1.state, wsPath));
    store2.dispatch(closeIfFound(store2.state, wsPath));
  };

  expect(1).toBe(1);
});
