export interface DesignTokens {
  theme: string;
  // WARNING: the width is hard coded at multiple places
  // it is currently not possible to change this value
  widescreenWidth: string;
  typography: {
    fontFamily: {
      sans: string;
      mono: string;
      serif: string;
    };
    text: {
      'xs': { size: string; height: string };
      'sm': { size: string; height: string };
      'base': { size: string; height: string };
      'lg': { size: string; height: string };
      'xl': { size: string; height: string };
      '2xl': { size: string; height: string };
      '3xl': { size: string; height: string };
    };
  };
  border: {
    radius: {
      // the default radius if not specified
      DEFAULT: string;
      none: string;
      sm: string;
      md: string;
      lg: string;
      xl: string;
    };
    width: {
      DEFAULT: string;
      none: string;
      md: string;
      lg: string;
    };
  };
  size: {
    'xs': string;
    'sm': string;
    'md': string;
    'lg': string;
    'xl': string;
    '2xl': string;
    '3xl': string;
    '4xl': string;
    '5xl': string;
    '6xl': string;
    '7xl': string;
    'prose': string;
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
    '5': string;
    '6': string;
    '7': string;
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

  ringWidth: {
    DEFAULT: string;
    none: string;
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

      primary: string;
      primaryLight: string;
      primaryInverted: string;

      secondary: string;
      secondaryLight: string;
      secondaryInverted: string;

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
    // Note:
    //  keys `bgColor` and `fgColor` will get added to `color.background` and `color.foreground`
    // can be used as `bg-appActivitybarBgColor`
    editor: {
      bgColor: string;
    };
    activitybar: {
      bgColor: string;
    };
  };
}
