import type { ThemeType } from '@bangle.io/shared-types';

export function applyTheme(theme: ThemeType) {
  console.debug('applying theme', theme);

  document.documentElement.setAttribute('data-theme', theme);
}
