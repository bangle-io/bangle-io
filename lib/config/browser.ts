const getBrowserInfo = () => {
  if (typeof navigator == 'undefined') {
    return 'unknown';
  }

  const nAgt = navigator.userAgent;

  let browserName;
  let browserVersion;
  let nameOffset;
  let verOffset;
  let index;

  // In Opera 15+, version is after "OPR/"
  if ((verOffset = nAgt.indexOf('OPR/')) !== -1) {
    browserName = 'Opera';
    browserVersion = nAgt.substring(verOffset + 4);
  } else if ((verOffset = nAgt.indexOf('Opera')) !== -1) {
    // In older Opera, version is after "Opera" or after "Version"
    browserName = 'Opera';

    if ((verOffset = nAgt.indexOf('Version')) !== -1) {
      browserVersion = nAgt.substring(verOffset + 8);
    } else {
      browserVersion = nAgt.substring(verOffset + 6);
    }
  } else if ((verOffset = nAgt.indexOf('MSIE')) !== -1) {
    // In MSIE, version is after "MSIE" in userAgent
    browserName = 'Microsoft Internet Explorer';
    browserVersion = nAgt.substring(verOffset + 5);
  } else if ((verOffset = nAgt.indexOf('Chrome')) !== -1) {
    // In Chrome, version is after "Chrome"
    browserName = 'Chrome';
    browserVersion = nAgt.substring(verOffset + 7);
  } else if ((verOffset = nAgt.indexOf('Safari')) !== -1) {
    // In Safari, version is after "Safari" or after "Version"
    browserName = 'Safari';

    if ((verOffset = nAgt.indexOf('Version')) !== -1) {
      browserVersion = nAgt.substring(verOffset + 8);
    } else {
      browserVersion = nAgt.substring(verOffset + 7);
    }
  } else if ((verOffset = nAgt.indexOf('Firefox')) !== -1) {
    // In Firefox, version is after "Firefox"
    browserName = 'Firefox';
    browserVersion = nAgt.substring(verOffset + 8);
  } else if (
    (nameOffset = nAgt.lastIndexOf(' ') + 1) <
    (verOffset = nAgt.lastIndexOf('/'))
  ) {
    // In most other browsers, "name/version" is at the end of userAgent
    browserName = nAgt.substring(nameOffset, verOffset);
    browserVersion = nAgt.substring(verOffset + 1);

    if (browserName.toLowerCase() === browserName.toUpperCase()) {
      browserName = navigator.appName;
    }
  } else {
    browserName = navigator.appName;
    browserVersion = '' + parseFloat(navigator.appVersion);
  }
  // trim the versionStr string at semicolon/space if present
  if ((index = browserVersion.indexOf(';')) !== -1) {
    browserVersion = browserVersion.substring(0, index);
  }
  if ((index = browserVersion.indexOf(' ')) !== -1) {
    browserVersion = browserVersion.substring(0, index);
  }

  return `${browserName} ${browserVersion}`.toLocaleLowerCase();
};

export const browserInfo = getBrowserInfo();

export const isFirefox = browserInfo.includes('firefox');
export const isSafari = browserInfo.includes('safari');
export const isChrome = browserInfo.includes('chrome');

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
      (target.navigator as any)['userAgentData']?.platform ||
      target.navigator.platform;

    return re.test(platform);
  }

  return false;
}

const isAndroid =
  typeof navigator != 'undefined'
    ? /Android \d/.test(navigator.userAgent)
    : false;

export const isMac = testPlatform(/^Mac/i);

const isIPhone = testPlatform(/^iPhone/i);

const isIPad =
  testPlatform(/^iPad/i) ||
  // iPadOS 13 lies and says it's a Mac, but we can distinguish by detecting touch support.
  (isMac && navigator.maxTouchPoints > 1);

const isIOS = isIPhone || isIPad;

export const isMobile = isAndroid || isIOS;
