export const isMac =
  typeof navigator != 'undefined' ? /Mac/.test(navigator.platform) : false;
