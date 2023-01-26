import type { DesignTokens, RecursivePartial } from '@bangle.io/shared-types';

import { darkColors, darkNeutralColor } from './dark-colors';
import { lightColors, lightNeutralColor } from './light-colors';
import { spectrumDarkest, spectrumLight } from './spectrum';

// WARNING: the width is hard coded at multiple places, search for it
// by value if you want to change it
const WIDESCREEN_WIDTH: DesignTokens['widescreenWidth'] = '759px';

export const defaultTokensLight: DesignTokens = {
  theme: 'default-tokens',
  uid: 'design-token::default-tokens-light',
  typography: {
    fontFamily: {
      sans: [
        'ui-sans-serif',
        'system-ui',
        '-apple-system',
        'BlinkMacSystemFont',
        '"Segoe UI"',
        'Roboto',
        '"Helvetica Neue"',
        'Arial',
        '"Noto Sans"',
        'sans-serif',
        '"Apple Color Emoji"',
        '"Segoe UI Emoji"',
        '"Segoe UI Symbol"',
        '"Noto Color Emoji"',
      ].join(','),
      serif: [
        'ui-serif',
        'Georgia',
        'Cambria',
        '"Times New Roman"',
        'Times',
        'serif',
      ].join(','),
      mono: [
        'ui-monospace',
        'SFMono-Regular',
        'Menlo',
        'Monaco',
        'Consolas',
        '"Liberation Mono"',
        '"Courier New"',
        'monospace',
      ].join(','),
    },
    text: {
      'xs': { size: '0.75rem', height: '1rem' },
      'sm': { size: '0.875rem', height: '1.25rem' },
      'base': { size: '1rem', height: '1.5rem' },
      'lg': { size: '1.125rem', height: '1.75rem' },
      'xl': { size: '1.25rem', height: '1.75rem' },
      '2xl': { size: '1.5rem', height: '2rem' },
      '3xl': { size: '1.875rem', height: '2.25rem' },
    },
  },
  border: {
    width: {
      DEFAULT: '1px',
      none: '0px',
      md: '1px',
      lg: '2px',
    },
    radius: {
      DEFAULT: '0.25rem',
      none: '0',
      sm: '0.125rem',
      md: '0.25rem',
      lg: '0.375rem',
      xl: '0.5rem',
    },
  },
  widescreenWidth: WIDESCREEN_WIDTH,
  space: {
    '0': '0',
    'px': '1px',
    '0_5': '0.125rem',
    '1': '0.25rem',
    '1_5': '0.375rem',
    '2': '0.5rem',
    '2_5': '0.625rem',
    '3': '0.75rem',
    '4': '1rem',
    '5': '1.25rem',
    '6': '1.5rem',
    '7': '1.75rem',
    '8': '2rem',
    '9': '2.25rem',
    '10': '2.5rem',
    '11': '2.75rem',
    '12': '3rem',
    '14': '3.5rem',
    '16': '4rem',
    '20': '5rem',
    '24': '6rem',
    '48': '12rem',
    '64': '16rem',
    '72': '18rem',
    '80': '20rem',
    '96': '24rem',
  },
  size: {
    'xs': '20rem',
    'sm': '24rem',
    'md': '28rem',
    'lg': '32rem',
    'xl': '36rem',
    '2xl': '42rem',
    '3xl': '48rem',
    '4xl': '56rem',
    '5xl': '64rem',
    '6xl': '72rem',
    '7xl': '80rem',
    'prose': '65ch',
  },
  misc: {
    activitybarBg: 'rgb(26, 32, 44)',
    activitybarBtnBgPress: 'rgb(104 109 120)',
    activitybarText: spectrumLight.gray100,

    editorBacklinkBg: spectrumLight.blue100,
    editorAttentionBg: spectrumLight.gray200,
    editorBacklinkBgHover: spectrumLight.blue200,
    editorBacklinkText: lightNeutralColor.text,
    editorBg: lightNeutralColor.bgLayerMiddle,
    editorCodeBg: spectrumLight.gray300,
    kbdBg: lightNeutralColor.solidSubdued,
    kbdText: lightNeutralColor.textSubdued,
    linkText: spectrumLight.blue700,
    searchHighlightBg: spectrumLight.yellow300,

    activitybarWidth: '50px',
    noteSidebarWidth: '300px',
    workspaceSidebarWidth: '300px',
    miniEditorWidth: '400px',

    noteTagsBg: lightNeutralColor.solid,
    noteTagsText: lightNeutralColor.textInverted,
    pagePadding: '3rem 30px 3rem 30px',
    pageMaxWidth: '700px',
  },
  ringWidth: {
    none: '0',
    DEFAULT: '1px',
  },
  color: lightColors,
};

export const defaultTokensDark: DesignTokens = {
  ...defaultTokensLight,
  uid: 'design-token::default-tokens-dark',
  misc: {
    ...defaultTokensLight.misc,

    activitybarBg: 'rgb(31, 30, 30)',
    activitybarBtnBgPress: spectrumDarkest.gray300,
    activitybarText: darkNeutralColor.textSubdued,
    editorBacklinkBg: spectrumDarkest.blue200,
    editorBacklinkBgHover: spectrumDarkest.blue300,
    editorAttentionBg: spectrumDarkest.gray200,

    editorBacklinkText: darkNeutralColor.text,
    editorBg: darkNeutralColor.bgLayerMiddle,
    editorCodeBg: spectrumDarkest.gray300,
    kbdBg: darkNeutralColor.solidSubdued,
    kbdText: darkNeutralColor.textSubdued,
    linkText: spectrumDarkest.blue800,
    searchHighlightBg: spectrumDarkest.yellow700,

    noteTagsBg: darkNeutralColor.solid,
    noteTagsText: darkNeutralColor.textInverted,
  },
  color: darkColors,
};

export const defaultSmallScreenOverride2: {
  misc: RecursivePartial<DesignTokens['misc']>;
} = {
  misc: {
    pagePadding: '1.5rem 10px 2rem 25px',
    activitybarBg: defaultTokensLight.misc.editorBg,
    activitybarText: lightColors.neutral.textSubdued,
  },
};

export const defaultSmallScreenOverrideLight: {
  misc: RecursivePartial<DesignTokens['misc']>;
} = {
  misc: {
    ...defaultSmallScreenOverride2.misc,
    activitybarBg: defaultTokensLight.misc.editorBg,
    activitybarText: lightColors.neutral.text,
  },
};

export const defaultSmallScreenOverrideDark: {
  color: RecursivePartial<DesignTokens['color']>;
  misc: RecursivePartial<DesignTokens['misc']>;
} = {
  color: {},
  misc: {
    ...defaultSmallScreenOverride2.misc,
    activitybarBg: defaultTokensDark.misc.editorBg,
  },
};
