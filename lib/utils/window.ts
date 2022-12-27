import { IS_STORYBOOK, SPLIT_SCREEN_MIN_WIDTH } from '@bangle.io/config';
import type { ThemeType } from '@bangle.io/shared-types';

import { isMobile } from './is-mac';
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

export function applyTheme(theme?: ThemeType) {
  if (typeof document === 'undefined') {
    console.debug('applyTheme: document is undefined');

    return;
  }

  if (IS_STORYBOOK) {
    console.warn(
      `applyTheme: Cannot apply theme in storybook. Please use the theme switcher in the toolbar.`,
    );

    return;
  }

  if (!theme) {
    console.debug('applyTheme: theme is undefined');

    return;
  }

  console.debug('applying theme', theme);

  document.documentElement.setAttribute('data-theme', theme);

  if (theme === 'dark') {
    document.body.classList.remove('light-theme');
    document.body.classList.add('dark-theme');
  } else {
    document.body.classList.remove('dark-theme');
    document.body.classList.add('light-theme');
  }
}
