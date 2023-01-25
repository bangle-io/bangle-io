// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import type { DesignTokens, ToneColors } from '@bangle.io/shared-types';

export { getFromPath, walkObject } from './walk-object';

// This exists to provide a shape for creating the vars object
const tokensShape: DesignTokens = {
  theme: '',
  uid: '',
  misc: {
    activitybarWidth: '',
    miniEditorWidth: '',
    noteSidebarWidth: '',
    noteTagsBg: '',
    noteTagsText: '',
    pageMaxWidth: '',
    pagePadding: '',
    workspaceSidebarWidth: '',

    activitybarBg: '',
    activitybarBtnBgPress: '',
    activitybarText: '',

    editorAttentionBg: '',
    editorBacklinkBg: '',
    editorBacklinkBgHover: '',
    editorBacklinkText: '',
    editorBg: '',
    editorCodeBg: '',
    kbdBg: '',
    kbdText: '',
    linkText: '',
    searchHighlightBg: '',
  },
  border: {
    radius: {
      DEFAULT: '',
      none: '',
      sm: '',
      md: '',
      lg: '',
      xl: '',
    },
    width: {
      DEFAULT: '',
      none: '',
      lg: '',
      md: '',
    },
  },
  widescreenWidth: '',
  color: {
    neutral: {
      bgLayerTop: '',
      bgLayerMiddle: '',
      bgLayerBottom: '',
      bgLayerFloat: '',

      textDisabled: '',
      textSubdued: '',
      text: '',
      textStrong: '',
      textInverted: '',
      textFieldBg: '',
      textFieldText: '',
      textFieldBorder: '',

      ...createToneColors(),
    },
    secondary: createToneColors(),
    promote: createToneColors(),
    caution: createToneColors(),
    critical: createToneColors(),
    positive: createToneColors(),
  },

  ringWidth: {
    DEFAULT: '',
    none: '',
  },
  size: {
    'xs': '',
    'sm': '',
    'md': '',
    'lg': '',
    'xl': '',
    '2xl': '',
    '3xl': '',
    '4xl': '',
    '5xl': '',
    '6xl': '',
    '7xl': '',
    'prose': '',
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
    '5': '',
    '6': '',
    '7': '',
    '8': '',
    '9': '',
    '10': '',
    '11': '',
    '12': '',
    '14': '',
    '16': '',
    '20': '',
    '24': '',
    '48': '',
    '64': '',
    '72': '',
    '80': '',
    '96': '',
    'px': '',
  },
  typography: {
    fontFamily: {
      sans: '',
      serif: '',
      mono: '',
    },
    text: {
      'xl': {
        height: '',
        size: '',
      },
      'lg': {
        height: '',
        size: '',
      },
      'base': {
        height: '',
        size: '',
      },

      'sm': {
        height: '',
        size: '',
      },
      'xs': {
        height: '',
        size: '',
      },
      '2xl': {
        height: '',
        size: '',
      },
      '3xl': {
        height: '',
        size: '',
      },
    },
  },
};

function createToneColors(): ToneColors {
  return {
    iconDisabled: '',
    iconSubdued: '',
    icon: '',

    solid: '',
    solidText: '',
    solidStrong: '',
    solidStronger: '',
    solidSubdued: '',
    solidFaint: '',

    borderSubdued: '',
    border: '',
    borderStrong: '',
  };
}

// unnest the object to get a better type
export const tokens = { ...tokensShape };
