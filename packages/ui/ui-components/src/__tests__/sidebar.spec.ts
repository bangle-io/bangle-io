import { SIDEBAR_MAX_WIDTH, SIDEBAR_MIN_WIDTH } from '@bangle.io/constants';
import { describe, expect, it } from 'vitest';
import { clampSidebarWidth } from '../sidebar';

describe('clampSidebarWidth', () => {
  it('preserves widths inside the supported range', () => {
    expect(clampSidebarWidth(312)).toBe(312);
  });

  it('keeps the sidebar within its usable minimum and maximum', () => {
    expect(clampSidebarWidth(100)).toBe(SIDEBAR_MIN_WIDTH);
    expect(clampSidebarWidth(900)).toBe(SIDEBAR_MAX_WIDTH);
  });

  it('supports custom bounds for reusable sidebar layouts', () => {
    expect(clampSidebarWidth(250, 260, 320)).toBe(260);
    expect(clampSidebarWidth(330, 260, 320)).toBe(320);
  });
});
