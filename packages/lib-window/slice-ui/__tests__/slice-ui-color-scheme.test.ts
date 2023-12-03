/**
 * @jest-environment @bangle.io/jsdom-env
 */
import { COLOR_SCHEME } from '@bangle.io/constants';
import { setupSliceTestStore } from '@bangle.io/test-utils-slice';

import { sliceUIColorScheme } from '../slice-ui-color-scheme';

describe('sliceUIColorScheme', () => {
  beforeEach(() => {
    // Set up your initial environment
    document.documentElement.className = '';
  });

  test('initial color scheme state based on document class', () => {
    const ctx = setupSliceTestStore({
      slices: [sliceUIColorScheme],
    });

    expect(sliceUIColorScheme.get(ctx.store.state).colorScheme).toBe(
      COLOR_SCHEME.LIGHT,
    );
  });
});
