export const isMac =
  typeof navigator != 'undefined' ? /Mac/.test(navigator.platform) : false;
export const isFirefox =
  typeof navigator != 'undefined'
    ? navigator.userAgent?.toLocaleLowerCase()?.indexOf('firefox') > -1
    : false;
