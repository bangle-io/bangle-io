type FontWeight = 'regular' | 'medium' | 'strong';

export interface DesignTokens {
  theme: string;
  breakpoints: {
    mobile: string;
    widescreen: string;
  };
  typography: {
    fontFamily: string;
    webFont: string;
    fontWeight: Record<FontWeight, '400' | '500' | '600' | '700' | '800'>;
    text: {
      xs: { size: string; height: string };
      sm: { size: string; height: string };
      md: { size: string; height: string };
      base: { size: string; height: string };
      lg: { size: string; height: string };
      xl: { size: string; height: string };
    };
  };
  focusRingSize: string;
  border: {
    shadows: {
      sm: string;
      md: string;
      lg: string;
    };
    radius: {
      none: string;
      sm: string;
      md: string;
      lg: string;
      xl: string;
    };
    width: {
      md: string;
      lg: string;
    };
    color: {
      focus: string;

      brandAccent: string;
      brandAccentLight: string;

      promote: string;
      promoteLight: string;

      neutral: string;
      neutralInverted: string;
      neutralLight: string;

      // the 4
      caution: string;
      cautionLight: string;
      critical: string;
      criticalLight: string;
      info: string;
      infoLight: string;
      positive: string;
      positiveLight: string;
    };
  };
  space: {
    '0': string;
    'px': string;
    '0_5': string;
    '1': string;
    '1_5': string;
    '2': string;
    '2_5': string;
    '3': string;
    '4': string;
    '6': string;
    '8': string;
    '9': string;
    '10': string;
    '12': string;
    '14': string;
    '16': string;
    '20': string;
    '24': string;
    '48': string;
  };
  radius: {
    none: string;
    sm: string;
    md: string;
    lg: string;
    full: string;
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
  };
  color: {
    // mostly used with texts
    foreground: {
      brandAccent: string;
      brandAccentLight: string;

      link: string;
      linkHover: string;
      linkLight: string;
      linkVisited: string;

      promote: string;
      promoteLight: string;

      neutral: string;
      neutralInverted: string;
      neutralLight: string;

      secondary: string;
      secondaryInverted: string;

      // the 4
      caution: string;
      cautionLight: string;
      critical: string;
      criticalLight: string;
      info: string;
      infoLight: string;
      positive: string;
      positiveLight: string;
    };
    background: {
      body: string;

      //   Used for surfaces that sit on top of body elements
      surface: string;
      surfaceDark: string;

      brand: string;

      brandAccent: string;
      brandAccentActive: string;
      brandAccentHover: string;
      brandAccentLight: string;
      brandAccentLightActive: string;
      brandAccentLightHover: string;

      neutral: string;
      neutralActive: string;
      neutralHover: string;
      neutralLight: string;
      neutralLightActive: string;
      neutralLightHover: string;
      // soft is a subtle shade for backgrounds
      neutralSoft: string;

      // the 4
      caution: string;
      cautionActive: string;
      cautionHover: string;
      cautionLight: string;
      cautionLightActive: string;
      cautionLightHover: string;

      critical: string;
      criticalActive: string;
      criticalHover: string;
      criticalLight: string;
      criticalLightActive: string;
      criticalLightHover: string;

      info: string;
      infoActive: string;
      infoHover: string;
      infoLight: string;
      infoLightActive: string;
      infoLightHover: string;

      positive: string;
      positiveActive: string;
      positiveHover: string;
      positiveLight: string;
      positiveLightActive: string;
      positiveLightHover: string;
    };
  };
  app: {
    editor: {
      backgroundColor: string;
    };
  };
}
