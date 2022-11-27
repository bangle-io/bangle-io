import type { DesignTokens } from '@bangle.io/shared-types';

import { walkObject } from './walk-object';

const tokensShape: DesignTokens = {
  app: {
    editor: {
      background: '',
    },
  },
  border: {
    color: {
      brandAccent: '',
      brandAccentLight: '',
      caution: '',
      cautionLight: '',
      critical: '',
      criticalLight: '',
      focus: '',
      info: '',
      infoLight: '',
      neutral: '',
      neutralInverted: '',
      neutralLight: '',
      positive: '',
      positiveLight: '',
      promote: '',
      promoteLight: '',
    },
    radius: {
      lg: '',
      md: '',
      none: '',
      sm: '',
      xl: '',
    },
    shadows: {
      lg: '',
      md: '',
      sm: '',
    },
    width: {
      lg: '',
      md: '',
    },
  },
  breakpoints: {
    mobile: '',
    widescreen: '',
  },
  color: {
    background: {
      body: '',
      brand: '',
      brandAccent: '',
      brandAccentActive: '',
      brandAccentHover: '',
      brandAccentLight: '',
      brandAccentLightActive: '',
      brandAccentLightHover: '',
      caution: '',
      cautionActive: '',
      cautionHover: '',
      cautionLight: '',
      cautionLightActive: '',
      cautionLightHover: '',
      critical: '',
      criticalActive: '',
      criticalHover: '',
      criticalLight: '',
      criticalLightActive: '',
      criticalLightHover: '',
      info: '',
      infoActive: '',
      infoHover: '',
      infoLight: '',
      infoLightActive: '',
      infoLightHover: '',
      neutral: '',
      neutralActive: '',
      neutralHover: '',
      neutralLight: '',
      neutralLightActive: '',
      neutralLightHover: '',
      neutralSoft: '',
      positive: '',
      positiveActive: '',
      positiveHover: '',
      positiveLight: '',
      positiveLightActive: '',
      positiveLightHover: '',
      surface: '',
      surfaceDark: '',
    },
    foreground: {
      brandAccent: '',
      brandAccentLight: '',
      caution: '',
      cautionLight: '',
      critical: '',
      criticalLight: '',
      info: '',
      infoLight: '',
      link: '',
      linkHover: '',
      linkLight: '',
      linkVisited: '',
      neutral: '',
      neutralInverted: '',
      neutralLight: '',
      positive: '',
      positiveLight: '',
      promote: '',
      promoteLight: '',
      secondary: '',
      secondaryInverted: '',
    },
  },
  focusRingSize: '',
  radius: {
    full: '',
    lg: '',
    md: '',
    none: '',
    sm: '',
  },
  shadows: {
    lg: '',
    md: '',
    sm: '',
  },
  space: {
    '0': '',
    '0_5': '',
    '1': '',
    '1_5': '',
    '2': '',
    '2_5': '',
    '3': '',
    '4': '',
    '6': '',
    '8': '',
    '9': '',
    'px': '',
  },
  theme: '',
  typography: {
    fontFamily: '',
    fontWeight: {
      medium: '400',
      regular: '400',
      strong: '400',
    },
    text: {
      lg: {
        height: '',
        size: '',
      },
      md: {
        height: '',
        size: '',
      },
      sm: {
        height: '',
        size: '',
      },
      xs: {
        height: '',
        size: '',
      },
    },
    webFont: '',
  },
};

const tokens = { ...tokensShape };

export const vars = walkObject(tokens, (value, path): string => {
  return createVar(path.join('-'));
}) as typeof tokens;

function createVar(id: string): string {
  if (/^[a-zA-Z0-9_-]*$/g.test(id)) {
    return `var(--BV-${id})`;
  }

  throw new Error(`Invalid id ${id}`);
}
