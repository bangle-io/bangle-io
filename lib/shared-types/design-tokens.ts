export type DesignTokens = {
  // name of theme derived from (for debugging)
  theme: string;
  // unique id of the theme, if it ends with `-light` or `-dark`, it is part of a light/dark theme
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
    positive: ToneColors;
    promote: ToneColors;
  };

  app: {
    // Note:
    // any object that has a key 'color', all the values inside it will be added to the colors
    // for example editor.color.myPink will be converted to a css class if using `bg-*` atomic class
    // .bg-color-editorMyPink { background-color: var(--editor.color.myPink) }
    // or if using `text-*` atomic class
    // .text-color-editorMyPink { color: var(--editor.color.myPink) }
    editor: {
      color: {
        bg: string;
      };
    };
    activitybar: {
      color: {
        bg: string;
      };
    };
  };
};

export type ToneColors = {
  iconDisabled: string;
  iconLight: string;
  icon: string;

  btn: string; // default button bg color
  btnColor: string; // default button color
  btnHover: string; // darker than btn
  btnDown: string; // darker than btnHover
  btnDisabled: string; // button bg color when disabled

  borderLight: string; // // for application layout
  border: string; // for application layout
  borderDark: string; // for textfield/action button
  borderDarker: string; // for checkbox/radio/switches
};

export type NeutralColors = ToneColors & {
  bgLayerTop: string; // top layer, for most important content example editor
  bgLayerMiddle: string; // middle layer for secondary content like sidebar
  bgLayerBottom: string; // bottom layer the background color of the  application
  bgLayerFloat: string; // background color for things that float on top of the application, like modal, dropdown, etc

  textDisabled: string; // for disabled
  textLight: string; // for secondary text
  text: string; // default text color
  textDark: string; // for headings
  textInverted: string;
};
