// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import type { DesignTokens } from '@bangle.io/shared-types';

export { getFromPath, walkObject } from './walk-object';

const tokensShape: DesignTokens = {
  app: {
    editor: {
      backgroundColor: '',
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
    '10': '',
    '12': '',
    '14': '',
    '16': '',
    '20': '',
    '24': '',
    '48': '',
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
      xl: {
        height: '',
        size: '',
      },
      lg: {
        height: '',
        size: '',
      },
      md: {
        height: '',
        size: '',
      },
      base: {
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

export const tokens = { ...tokensShape };