export const SPLIT_SCREEN_MIN_WIDTH = parseInt(
  getComputedStyle(document.documentElement).getPropertyValue(
    '--wide-screen-min-width',
  ),
  10,
);
