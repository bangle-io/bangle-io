import { WIDESCREEN_WIDTH } from '@bangle.io/constants';

import { isMobile } from '@bangle.io/mini-js-utils';

export function checkWidescreen(
  width = typeof window !== 'undefined' ? window.innerWidth : undefined,
) {
  if (isMobile) {
    return false;
  }

  return width ? WIDESCREEN_WIDTH <= width : false;
}
