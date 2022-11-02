import type { ThemeType } from '@bangle.io/shared-types';

export function applyTheme(theme: ThemeType) {
  if (typeof document === 'undefined') {
    console.debug('applyTheme: document is undefined');

    return;
  }
  console.debug('applying theme', theme);

  document.documentElement.setAttribute('data-theme', theme);
}
