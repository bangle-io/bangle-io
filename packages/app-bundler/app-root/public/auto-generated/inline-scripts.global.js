(function () {
  'use strict';

  // global-this.ts
  if (typeof globalThis === "undefined") {
    if (typeof self !== "undefined") {
      self.globalThis = self;
    } else if (typeof window !== "undefined") {
      window.globalThis = window;
    } else if (typeof global !== "undefined") {
      global.globalThis = global;
    }
  }

  // theme.ts
  if (typeof window !== "undefined") {
    let getColorPreference = function() {
      const existing = localStorage.getItem(storageKey);
      if (existing && (existing === DARK_THEME || existing === LIGHT_THEME))
        return existing;
      else
        return window.matchMedia("(prefers-color-scheme: dark)").matches ? DARK_THEME : LIGHT_THEME;
    }, setPreference = function() {
      localStorage.setItem(storageKey, theme.value);
      reflectPreference();
    }, reflectPreference = function() {
      document.firstElementChild.setAttribute("data-theme", theme.value);
      document.firstElementChild.classList.remove(LIGHT_THEME, DARK_THEME);
      document.firstElementChild.classList.add(theme.value);
    };
    const LIGHT_THEME = "BU_light-scheme";
    const DARK_THEME = "BU_dark-scheme";
    const storageKey = "theme";
    const theme = {
      value: getColorPreference()
    };
    reflectPreference();
    window.addEventListener("onload", () => {
      reflectPreference();
    });
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", ({ matches: isDark }) => {
      theme.value = isDark ? DARK_THEME : LIGHT_THEME;
      setPreference();
    });
  }

  // ../../shared/constants/ui.ts
  var WIDESCREEN_WIDTH = 759;

  // widescreen.ts
  function testPlatform(re) {
    var _a;
    let target = typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : typeof global !== "undefined" ? (
      // eslint-disable-next-line no-undef
      global
    ) : {};
    if (target.navigator != null) {
      const platform = ((_a = target.navigator.userAgentData) == null ? void 0 : _a.platform) || target.navigator.platform;
      return re.test(platform);
    }
    return false;
  }
  var isAndroid = typeof navigator != "undefined" ? /Android \d/.test(navigator.userAgent) : false;
  var isMac = testPlatform(/^Mac/i);
  var isIPhone = testPlatform(/^iPhone/i);
  var isIPad = testPlatform(/^iPad/i) || // iPadOS 13 lies and says it's a Mac, but we can distinguish by detecting touch support.
  isMac && navigator.maxTouchPoints > 1;
  var isIOS = isIPhone || isIPad;
  var isMobile = isAndroid || isIOS;
  function checkWidescreen(width = typeof window !== "undefined" ? window.innerWidth : void 0) {
    if (isMobile) {
      return false;
    }
    return width ? WIDESCREEN_WIDTH <= width : false;
  }
  function setRootWidescreenClass() {
    if (typeof document === "undefined") {
      return;
    }
    const widescreen = checkWidescreen();
    setItem(document.firstElementChild);
    function setItem(element) {
      if (!element) {
        return;
      }
      if (widescreen) {
        element.classList.add("BU_widescreen");
        element.classList.remove("BU_smallscreen");
      } else {
        element.classList.remove("BU_widescreen");
        element.classList.add("BU_smallscreen");
      }
    }
  }
  setRootWidescreenClass();

})();
