import {
  IS_STORYBOOK,
  isMobile,
  SPLIT_SCREEN_MIN_WIDTH,
} from '@bangle.io/config';
import type { ColorScheme } from '@bangle.io/constants';
import { COLOR_SCHEMA } from '@bangle.io/constants';

import { rafSchedule } from './safe-js';

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

  return width ? SPLIT_SCREEN_MIN_WIDTH <= width : false;
}

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

export function changeColorScheme(colorScheme?: ColorScheme) {
  if (typeof document === 'undefined') {
    console.debug('applyTheme: document is undefined');

    return;
  }

  if (IS_STORYBOOK) {
    console.warn(
      `changeColorScheme: Cannot apply change color scheme in storybook. Please use the switcher in the toolbar.`,
    );

    return;
  }

  if (!colorScheme) {
    console.debug('changeColorScheme: colorScheme is undefined');

    return;
  }

  console.debug('changeColorScheme:', colorScheme);

  if (colorScheme === COLOR_SCHEMA.DARK) {
    document.body.classList.remove('light-scheme');
    document.body.classList.add('dark-scheme');
  } else if (colorScheme === COLOR_SCHEMA.LIGHT) {
    document.body.classList.remove('dark-scheme');
    document.body.classList.add('light-scheme');
  } else {
    console.warn('changeColorSchemes: unknown theme', colorScheme);
  }
}
