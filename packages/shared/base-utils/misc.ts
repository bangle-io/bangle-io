import { WIDESCREEN_WIDTH } from '@bangle.io/constants';

import { isMobile } from '@bangle.io/mini-js-utils';

export function setRootWidescreenClass(
  widescreen: boolean = checkWidescreen(),
) {
  if (typeof document === 'undefined') {
    return;
  }

  const root = document.getElementById('root');
  const body = document.body;

  if (widescreen) {
    root?.classList.add('BU_widescreen');
    body.classList.add('BU_widescreen');

    root?.classList.remove('BU_smallscreen');
    body.classList.remove('BU_smallscreen');
  } else {
    root?.classList.remove('BU_widescreen');
    body.classList.remove('BU_widescreen');

    root?.classList.add('BU_smallscreen');
    body.classList.add('BU_smallscreen');
  }
}

export function checkWidescreen(
  width = typeof window !== 'undefined' ? window.innerWidth : undefined,
) {
  if (isMobile) {
    return false;
  }

  return width ? WIDESCREEN_WIDTH <= width : false;
}
