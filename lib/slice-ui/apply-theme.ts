import type { ThemeType } from '@bangle.io/shared-types';

import { cssVars } from './css-vars';

export function applyTheme(theme: ThemeType) {
  console.debug('applying theme', theme);
  const element = document.documentElement;
  for (const cssVar of cssVars) {
    updateStyleHelper(theme, cssVar, element);
  }
}

function updateStyleHelper(
  theme: ThemeType,
  cssVar: string,
  element: HTMLElement,
) {
  element.style.setProperty(`--BV-${cssVar}`, `var(--BV-${theme}-${cssVar})`);
}
