import { WIDESCREEN_WIDTH } from '@bangle.io/constants';

function testPlatform(re: RegExp) {
  let target: any =
    typeof globalThis !== 'undefined'
      ? globalThis
      : typeof window !== 'undefined'
      ? window
      : typeof global !== 'undefined'
      ? global
      : {};

  if (target.navigator != null) {
    const platform =
      target.navigator.userAgentData?.platform || target.navigator.platform;

    return re.test(platform);
  }

  return false;
}

const isAndroid =
  typeof navigator != 'undefined'
    ? /Android \d/.test(navigator.userAgent)
    : false;

const isMac = testPlatform(/^Mac/i);

const isIPhone = testPlatform(/^iPhone/i);

const isIPad =
  testPlatform(/^iPad/i) ||
  // iPadOS 13 lies and says it's a Mac, but we can distinguish by detecting touch support.
  (isMac && navigator.maxTouchPoints > 1);

const isIOS = isIPhone || isIPad;

const isMobile = isAndroid || isIOS;

function checkWidescreen(
  width = typeof window !== 'undefined' ? window.innerWidth : undefined,
) {
  if (isMobile) {
    return false;
  }

  return width ? WIDESCREEN_WIDTH <= width : false;
}

function setRootWidescreenClass() {
  if (typeof document === 'undefined') {
    return;
  }
  const widescreen: boolean = checkWidescreen();

  setItem(document.firstElementChild);

  function setItem(element: Element | null) {
    if (!element) {
      return;
    }

    if (widescreen) {
      element.classList.add('BU_widescreen');
      element.classList.remove('BU_smallscreen');
    } else {
      element.classList.remove('BU_widescreen');
      element.classList.add('BU_smallscreen');
    }
  }
}

setRootWidescreenClass();
