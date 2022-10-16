import { SPLIT_SCREEN_MIN_WIDTH } from '@bangle.io/config';

import { isMobile } from './is-mac';
import { rafSchedule } from './safe-js-callbacks';

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

export const checkWidescreen = (
  width = typeof window !== 'undefined' ? window.innerWidth : undefined,
) => {
  if (isMobile) {
    return false;
  }

  return width ? SPLIT_SCREEN_MIN_WIDTH <= width : false;
};

export function listenToResize(
  onResize: (obj: { width: number; height: number }) => void,
  abortSignal: AbortSignal,
) {
  if (typeof window === 'undefined') {
    return;
  }
  // Handler to call on window resize
  const handleResize = rafSchedule(() => {
    onResize({
      width: window.innerWidth,
      height: window.innerHeight,
    });
  });

  // Add event listener
  window.addEventListener('resize', handleResize);

  abortSignal.addEventListener(
    'abort',
    () => {
      handleResize.cancel();
      window.removeEventListener('resize', handleResize);
    },
    {
      once: true,
    },
  );
}
