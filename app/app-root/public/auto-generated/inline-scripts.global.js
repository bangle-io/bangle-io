(function () {
  'use strict';

  // theme.ts
  if (typeof window !== "undefined") {
    let getColorPreference = function() {
      const existing = localStorage.getItem(storageKey);
      if (existing)
        return existing;
      else
        return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark-scheme" : "light-scheme";
    }, setPreference = function() {
      localStorage.setItem(storageKey, theme.value);
      reflectPreference();
    }, reflectPreference = function() {
      document.firstElementChild.setAttribute("data-theme", theme.value);
      document.firstElementChild.classList.add(theme.value);
    };
    const storageKey = "theme";
    const theme = {
      value: getColorPreference()
    };
    reflectPreference();
    window.addEventListener("onload", () => {
      reflectPreference();
    });
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", ({ matches: isDark }) => {
      theme.value = isDark ? "dark-scheme" : "light-scheme";
      setPreference();
    });
  }

})();
