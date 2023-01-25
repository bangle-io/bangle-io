import type { DesignTokens, RecursivePartial } from '@bangle.io/shared-types';

import { darkColors } from './dark-colors';
import { lightColors } from './light-colors';

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
    activitybarWidth: '50px',
    noteSidebarWidth: '300px',
    workspaceSidebarWidth: '300px',
    miniEditorWidth: '400px',
    noteTagsBg: 'rgb(66, 66, 66)',
    noteTagsText: 'rgb(255, 255, 255)',
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
    noteTagsBg: 'rgb(66, 66, 66)',
    noteTagsText: 'rgb(255, 255, 255)',
  },
  color: darkColors,
};

export const defaultSmallScreenOverride2: {
  color: RecursivePartial<DesignTokens['color']>;
  misc: RecursivePartial<DesignTokens['misc']>;
} = {
  color: {
    app: {
      activitybarBg: lightColors.app.editorBg,
      activitybarText: lightColors.neutral.textSubdued,
    },
  },
  misc: {
    pagePadding: '1.5rem 10px 2rem 25px',
  },
};

export const defaultSmallScreenOverrideLight: {
  color: RecursivePartial<DesignTokens['color']>;
  misc: RecursivePartial<DesignTokens['misc']>;
} = {
  color: {
    app: {
      activitybarBg: lightColors.app.editorBg,
      activitybarText: lightColors.neutral.text,
    },
  },
  misc: defaultSmallScreenOverride2.misc,
};

export const defaultSmallScreenOverrideDark: {
  color: RecursivePartial<DesignTokens['color']>;
  misc: RecursivePartial<DesignTokens['misc']>;
} = {
  color: {
    app: {
      activitybarBg: darkColors.app.editorBg,
    },
  },
  misc: defaultSmallScreenOverride2.misc,
};
