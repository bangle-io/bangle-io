const getBrowserInfo = () => {
  if (typeof navigator === 'undefined') {
    return 'unknown';
  }

  const nAgt = navigator.userAgent;

  let browserName = navigator.appName;
  let browserVersion = navigator.appVersion;
  let nameOffset = 0;
  let verOffset = 0;
  let index = 0;

  // In Opera 15+, version is after "OPR/"
  verOffset = nAgt.indexOf('OPR/');
  if (verOffset !== -1) {
    browserName = 'Opera';
    browserVersion = nAgt.substring(verOffset + 4);
  } else {
    verOffset = nAgt.indexOf('Opera');
    if (verOffset !== -1) {
      // In older Opera, version is after "Opera" or after "Version"
      browserName = 'Opera';
      verOffset = nAgt.indexOf('Version');
      if (verOffset !== -1) {
        browserVersion = nAgt.substring(verOffset + 8);
      } else {
        browserVersion = nAgt.substring(verOffset + 6);
      }
    } else {
      verOffset = nAgt.indexOf('MSIE');
      if (verOffset !== -1) {
        // In MSIE, version is after "MSIE" in userAgent
        browserName = 'Microsoft Internet Explorer';
        browserVersion = nAgt.substring(verOffset + 5);
      } else {
        verOffset = nAgt.indexOf('Chrome');
        if (verOffset !== -1) {
          // In Chrome, version is after "Chrome"
          browserName = 'Chrome';
          browserVersion = nAgt.substring(verOffset + 7);
        } else {
          verOffset = nAgt.indexOf('Safari');
          if (verOffset !== -1) {
            // In Safari, version is after "Safari" or after "Version"
            browserName = 'Safari';
            verOffset = nAgt.indexOf('Version');
            if (verOffset !== -1) {
              browserVersion = nAgt.substring(verOffset + 8);
            } else {
              browserVersion = nAgt.substring(verOffset + 7);
            }
          } else {
            verOffset = nAgt.indexOf('Firefox');
            if (verOffset !== -1) {
              // In Firefox, version is after "Firefox"
              browserName = 'Firefox';
              browserVersion = nAgt.substring(verOffset + 8);
            } else {
              nameOffset = nAgt.lastIndexOf(' ') + 1;
              verOffset = nAgt.lastIndexOf('/');
              if (nameOffset < verOffset) {
                // In most other browsers, "name/version" is at the end of userAgent
                browserName = nAgt.substring(nameOffset, verOffset);
                browserVersion = nAgt.substring(verOffset + 1);

                if (browserName.toLowerCase() === browserName.toUpperCase()) {
                  browserName = navigator.appName;
                }
              } else {
                browserName = navigator.appName;
                browserVersion = `${Number.parseFloat(navigator.appVersion)}`;
              }
            }
          }
        }
      }
    }
  }
  // trim the versionStr string at semicolon/space if present
  index = browserVersion.indexOf(';');
  if (index !== -1) {
    browserVersion = browserVersion.substring(0, index);
  }
  index = browserVersion.indexOf(' ');
  if (index !== -1) {
    browserVersion = browserVersion.substring(0, index);
  }

  return `${browserName} ${browserVersion}`.toLocaleLowerCase();
};

export const browserInfo = getBrowserInfo();

export const isFirefox = browserInfo.includes('firefox');
export const isSafari = browserInfo.includes('safari');
export const isChrome = browserInfo.includes('chrome');

function testPlatform(re: RegExp) {
  if (typeof navigator !== 'undefined') {
    const navigatorWithUserAgentData = navigator as Navigator & {
      userAgentData?: { platform?: string };
    };
    const platform =
      navigatorWithUserAgentData.userAgentData?.platform ||
      navigatorWithUserAgentData.platform;

    return re.test(platform);
  }

  return false;
}

const isAndroid =
  typeof navigator !== 'undefined'
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

export const isDarwin = isMac || isIOS;
