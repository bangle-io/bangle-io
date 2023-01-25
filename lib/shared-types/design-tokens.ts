export type DesignTokens = {
  // name of theme derived from (for debugging)
  theme: string;
  // unique id of the theme, if it ends with `-light` or `-dark`, it is part of a light/dark color scheme
  uid: string;
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
    '11': string;
    '12': string;
    '14': string;
    '16': string;
    '20': string;
    '24': string;
    '48': string;
    '64': string;
    '72': string;
    '80': string;
    '96': string;
  };

  ringWidth: {
    DEFAULT: string;
    none: string;
  };

  // colors will be added to atomic classes
  // for example `bg-colorCriticalIcon` will add a background-color
  // .bg-colorCriticalIcon { background-color: var(--color.critical.icon) }
  color: {
    caution: ToneColors;
    critical: ToneColors;
    // Note: neutral tone has a shorthand which you can access as
    // .bg-colorBg { background-color: var(--color.neutral.bg) }
    //  which is same as
    // .bg-colorNeutralBg { background-color: var(--color.neutral.bg) }
    neutral: NeutralColors;
    // a secondary tone to the neutral tone, to distinguish UI elements
    // from the neutral color
    secondary: ToneColors;

    positive: ToneColors;
    promote: ToneColors;
  };

  // misc will not be added to atomic classes
  // and can be accessed using typescript `vars.misc.myKey` or
  // directly using `var(--misc.myKey)` in css.
  misc: {
    activitybarBg: string;
    activitybarBtnBgPress: string;
    activitybarText: string;

    editorAttentionBg: string;
    editorBacklinkBg: string;
    editorBacklinkBgHover: string;
    editorBacklinkText: string;
    editorBg: string;
    editorCodeBg: string;
    kbdBg: string;
    kbdText: string;
    linkText: string;
    searchHighlightBg: string;

    activitybarWidth: string;
    miniEditorWidth: string;
    noteSidebarWidth: string;
    workspaceSidebarWidth: string;
    noteTagsText: string;
    noteTagsBg: string;

    pagePadding: string;
    // not applicable to small screens
    pageMaxWidth: string;
  };
};

export type ToneColors = {
  iconDisabled: string;
  iconSubdued: string;
  icon: string;

  solid: string; // strong color for filling in shapes like a button
  solidStrong: string; // darker variant, for hover/focus
  solidStronger: string; // more darker variant, for pressed state
  solidFaint: string; // very light variant for filling shapes, for example a disabled button
  solidSubdued: string; // a light variant for filling shapes
  solidText: string; // color for text inside solid shapes like button

  borderSubdued: string; // // for application layout but lighter
  border: string; // for application layout
  borderStrong: string; // for a stronger border application layout
};

export type NeutralColors = ToneColors & {
  bgLayerTop: string; // top layer, for most important content example editor
  bgLayerMiddle: string; // middle layer for secondary content like sidebar
  bgLayerBottom: string; // bottom layer the background color of the  application
  bgLayerFloat: string; // background color for things that float on top of the application, like modal, dropdown, etc

  textDisabled: string; // for disabled
  textSubdued: string; // for secondary text
  text: string; // default text color
  textStrong: string; // for headings
  textInverted: string;
  textFieldBg: string; // color to fill the input fields with
  textFieldText: string; // color for text inside input fields
  textFieldBorder: string; // color for border of input fields
};
