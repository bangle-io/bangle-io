/* eslint-disable no-inner-declarations */
import { WIDESCREEN_WIDTH } from '@bangle.io/constants';

if (typeof window !== 'undefined') {
  const storageKey = 'theme';
  const theme = {
    value: getColorPreference(),
  };
  reflectPreference();

  window.addEventListener('onload', () => {
    reflectPreference();
  });

  // sync with system changes
  window
    .matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', ({ matches: isDark }) => {
      theme.value = isDark ? 'dark-scheme' : 'light-scheme';
      setPreference();
    });

  function getColorPreference(): string {
    const existing = localStorage.getItem(storageKey);
    if (existing) return existing;
    else
      return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark-scheme'
        : 'light-scheme';
  }
  function setPreference() {
    localStorage.setItem(storageKey, theme.value);
    reflectPreference();
  }
  function reflectPreference() {
    document!.firstElementChild!.setAttribute('data-theme', theme.value);
    document!.firstElementChild!.classList.add(theme.value);
  }
}
