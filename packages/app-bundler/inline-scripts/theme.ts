/* eslint-disable no-inner-declarations */

if (typeof window !== 'undefined') {
  const LIGHT_THEME = 'BU_light-scheme';
  const DARK_THEME = 'BU_dark-scheme';

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
      theme.value = isDark ? DARK_THEME : LIGHT_THEME;
      setPreference();
    });

  function getColorPreference(): string {
    const existing = localStorage.getItem(storageKey);

    if (existing && (existing === DARK_THEME || existing === LIGHT_THEME))
      return existing;
    else
      return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? DARK_THEME
        : LIGHT_THEME;
  }
  function setPreference() {
    localStorage.setItem(storageKey, theme.value);
    reflectPreference();
  }

  function reflectPreference() {
    document!.firstElementChild!.setAttribute('data-theme', theme.value);
    document!.firstElementChild!.classList.remove(LIGHT_THEME, DARK_THEME);
    document!.firstElementChild!.classList.add(theme.value);
  }
}
