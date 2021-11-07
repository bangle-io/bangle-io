import { cssVars } from './css-vars';

export type ThemeType = 'dark' | 'light';

export function applyTheme(theme: ThemeType) {
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
  element.style.setProperty(`--${cssVar}`, `var(--${theme}-${cssVar})`);
}
