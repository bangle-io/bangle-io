/* eslint-disable no-inner-declarations */

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
      theme.value = isDark ? 'BU_dark-scheme' : 'BU_light-scheme';
      setPreference();
    });

  function getColorPreference(): string {
    const existing = localStorage.getItem(storageKey);
    if (existing) return existing;
    else
      return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'BU_dark-scheme'
        : 'BU_light-scheme';
  }
  function setPreference() {
    localStorage.setItem(storageKey, theme.value);
    reflectPreference();
  }

  function reflectPreference() {
    document!.firstElementChild!.setAttribute('data-theme', theme.value);
    document!.firstElementChild!.classList.remove(
      'BU_light-scheme',
      'BU_dark-scheme',
    );
    document!.firstElementChild!.classList.add(theme.value);
  }
}
