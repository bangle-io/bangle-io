/**
 * @jest-environment @bangle.io/jsdom-env
 */
import { setupSliceTestStore } from '@bangle.io/test-utils-slice';

import { sliceUIWidescreen } from '../slice-ui-widescreen';
let abortController = new AbortController();

beforeEach(() => {
  abortController = new AbortController();
});

afterEach(() => {
  abortController.abort();
});

describe('sliceUIWidescreen', () => {
  test('initial widescreen state based on document class', () => {
    document.documentElement.classList.add('BU_widescreen');
    const ctx = setupSliceTestStore({
      slices: [sliceUIWidescreen],
      abortSignal: abortController.signal,
    });

    expect(sliceUIWidescreen.get(ctx.store.state).widescreen).toBe(true);
  });
});
