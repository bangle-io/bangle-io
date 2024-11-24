// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';

import { calcMainContentWidth } from '../index';

describe('calcMainContentWidth', () => {
  type CalcMainContentWidthParams = Parameters<typeof calcMainContentWidth>[0];

  const mockWindowWidth = (width: number) => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: width,
    });
  };

  beforeEach(() => {
    mockWindowWidth(1200);
  });

  it('should calculate width correctly with both asides', () => {
    const opts: CalcMainContentWidthParams = {
      hasActivitybar: false,
      activitybarWidth: 50,
      leftWidth: 200,
      rightWidth: 300,
      hasLeftAside: true,
      hasRightAside: true,
      borderWidth: 10,
    };
    const expectedWidth = 1200 - 200 - 300 - 2 * 2 * opts.borderWidth;
    expect(calcMainContentWidth(opts)).toBe(expectedWidth);
  });

  it('should calculate width correctly with only left aside', () => {
    const opts: CalcMainContentWidthParams = {
      hasActivitybar: false,
      activitybarWidth: 50,
      leftWidth: 200,
      rightWidth: 300,
      hasLeftAside: true,
      hasRightAside: false,
      borderWidth: 10,
    };
    const expectedWidth = 1200 - 200 - 1 * 2 * opts.borderWidth;
    expect(calcMainContentWidth(opts)).toBe(expectedWidth);
  });

  it('should calculate width correctly with only right aside', () => {
    const opts: CalcMainContentWidthParams = {
      hasActivitybar: false,
      activitybarWidth: 50,
      leftWidth: 200,
      rightWidth: 300,
      hasLeftAside: false,
      hasRightAside: true,
      borderWidth: 10,
    };
    const expectedWidth = 1200 - 300 - 1 * 2 * opts.borderWidth;
    expect(calcMainContentWidth(opts)).toBe(expectedWidth);
  });

  it('should calculate width correctly with no asides', () => {
    const opts: CalcMainContentWidthParams = {
      hasActivitybar: false,
      activitybarWidth: 50,
      leftWidth: 200,
      rightWidth: 300,
      hasLeftAside: false,
      hasRightAside: false,
      borderWidth: 10,
    };
    const expectedWidth = 1200;
    expect(calcMainContentWidth(opts)).toBe(expectedWidth);
  });

  it('should not return a negative width', () => {
    const opts: CalcMainContentWidthParams = {
      hasActivitybar: false,
      activitybarWidth: 50,
      leftWidth: 600,
      rightWidth: 700,
      hasLeftAside: true,
      hasRightAside: true,
      borderWidth: 10,
    };
    expect(calcMainContentWidth(opts)).toBe(0);
  });

  it('should adjust width based on dynamic window.innerWidth', () => {
    window.innerWidth = 800;
    const opts: CalcMainContentWidthParams = {
      hasActivitybar: false,
      activitybarWidth: 50,
      leftWidth: 100,
      rightWidth: 100,
      hasLeftAside: true,
      hasRightAside: true,
      borderWidth: 5,
    };
    const expectedWidth = 800 - 100 - 100 - 2 * 2 * opts.borderWidth;
    expect(calcMainContentWidth(opts)).toBe(expectedWidth);
  });

  it('should calculate width correctly accounting for activitybarWidth', () => {
    const opts: CalcMainContentWidthParams = {
      hasActivitybar: true,
      activitybarWidth: 50,
      leftWidth: 150,
      rightWidth: 250,
      hasLeftAside: true,
      hasRightAside: true,
      borderWidth: 5,
    };
    expect(calcMainContentWidth(opts)).toBe(730);
  });
});
