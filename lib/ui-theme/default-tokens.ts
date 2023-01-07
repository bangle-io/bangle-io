import type {
  BangleThemeInputDualColorScheme,
  BangleThemeInputSingleScheme,
  DesignTokens,
} from '@bangle.io/shared-types';

import { darkColors } from './dark-colors';
import { lightColors } from './light-colors';

// WARNING: the width is hard coded at multiple places, search for it
// by value if you want to change it
const WIDESCREEN_WIDTH: DesignTokens['widescreenWidth'] = '759px';

const defaultBorder: Omit<DesignTokens['border'], 'color'> = {
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
};

const defaultRingWidth: DesignTokens['ringWidth'] = {
  none: '0',
  DEFAULT: '1px',
};

const defaultSize: DesignTokens['size'] = {
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
};

const defaultSpace: DesignTokens['space'] = {
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
};

const defaultFontFamily: DesignTokens['typography']['fontFamily'] = {
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
};

const defaultTypography: DesignTokens['typography'] = {
  fontFamily: defaultFontFamily,
  text: {
    'xs': { size: '0.75rem', height: '1rem' },
    'sm': { size: '0.875rem', height: '1.25rem' },
    'base': { size: '1rem', height: '1.5rem' },
    'lg': { size: '1.125rem', height: '1.75rem' },
    'xl': { size: '1.25rem', height: '1.75rem' },
    '2xl': { size: '1.5rem', height: '2rem' },
    '3xl': { size: '1.875rem', height: '2.25rem' },
  },
};

const defaultMiscTokens: DesignTokens['misc'] = {
  activitybarWidth: '50px',
  noteSidebarWidth: '300px',
  workspaceSidebarWidth: '300px',
  miniEditorWidth: '400px',
  noteTagsBg: 'rgb(66, 66, 66)',
  noteTagsText: 'rgb(255, 255, 255)',
};

export const defaultsLight: DesignTokens = {
  theme: 'default-tokens',
  uid: 'design-token::default-tokens-light',
  typography: defaultTypography,
  border: defaultBorder,
  widescreenWidth: WIDESCREEN_WIDTH,
  space: defaultSpace,
  size: defaultSize,
  misc: defaultMiscTokens,
  ringWidth: defaultRingWidth,
  color: lightColors,
};

export const defaultsDark: DesignTokens = {
  ...defaultsLight,
  uid: 'design-token::default-tokens-dark',
  color: darkColors,
};

export const defaultSmallScreenOverrideSingle: BangleThemeInputSingleScheme = {
  color: {
    app: {
      activitybarBg: lightColors.app.editorBg,
      activitybarText: lightColors.neutral.textSubdued,
    },
  },
};

export const defaultSmallScreenOverrideDualColorScheme: BangleThemeInputDualColorScheme =
  {
    ...defaultSmallScreenOverrideSingle,
    color: {
      light: {
        app: {
          activitybarBg: lightColors.app.editorBg,
          activitybarText: lightColors.neutral.text,
        },
      },
      dark: {
        app: {
          activitybarBg: darkColors.app.editorBg,
        },
      },
    },
    misc: {},
  };
