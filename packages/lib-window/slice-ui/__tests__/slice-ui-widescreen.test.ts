/**
 * @jest-environment @bangle.io/jsdom-env
 */
import { setupSliceTestStore } from '@bangle.io/test-utils-slice';

import { sliceUIWidescreen } from '../slice-ui-widescreen';

describe('sliceUIWidescreen', () => {
  test('initial widescreen state based on document class', () => {
    document.documentElement.classList.add('BU_widescreen');
    const ctx = setupSliceTestStore({
      slices: [sliceUIWidescreen],
    });

    expect(sliceUIWidescreen.get(ctx.store.state).widescreen).toBe(true);
  });
});
