import { rgba } from 'polished';

import type { DesignTokens } from '@bangle.io/shared-types';

import { color } from './color-palette';

export const defaultFocusRingSize = '2';

export const defaultBreakpoints: DesignTokens['breakpoints'] = {
  mobile: '0px',
  // TODO: move this to css `var`
  widescreen: '760px',
};

export const defaultShadows: DesignTokens['shadows'] = {
  sm: [
    `0 2px 4px 0px ${rgba(color.gray['800'], 0.1)}`,
    `0 2px 2px -2px ${rgba(color.gray['800'], 0.1)}`,
    `0 4px 4px -4px ${rgba(color.gray['800'], 0.2)}`,
  ].join(', '),
  md: [
    `0 2px 4px 0px ${rgba(color.gray['800'], 0.1)}`,
    `0 8px 8px -4px ${rgba(color.gray['800'], 0.1)}`,
    `0 12px 12px -8px ${rgba(color.gray['800'], 0.2)}`,
  ].join(', '),
  lg: [
    `0 2px 4px 0px ${rgba(color.gray['800'], 0.1)}`,
    `0 12px 12px -4px ${rgba(color.gray['800'], 0.1)}`,
    `0 20px 20px -12px ${rgba(color.gray['800'], 0.2)}`,
  ].join(', '),
};

export const defaultBorder: Omit<DesignTokens['border'], 'color'> = {
  width: {
    md: '1',
    lg: '2',
  },
  shadows: {
    sm: '0 2px 4px 0px rgba(28,28,28,.1), 0 2px 2px -2px rgba(28,28,28,.1), 0 4px 4px -4px rgba(28,28,28,.2)',
    md: '0 2px 4px 0px rgba(28,28,28,.1), 0 8px 8px -4px rgba(28,28,28,.1), 0 12px 12px -8px rgba(28,28,28,.2)',
    lg: '0 2px 4px 0px rgba(28,28,28,.1), 0 12px 12px -4px rgba(28,28,28,.1), 0 20px 20px -12px rgba(28,28,28,.2)',
  },
  radius: {
    none: '0',
    sm: '0.125rem',
    md: '0.25rem',
    lg: '0.375rem',
    xl: '0.5rem',
  },
};

export const defaultRadius: DesignTokens['radius'] = {
  none: '0',
  sm: '0.125rem',
  md: '0.25rem',
  lg: '0.5rem',
  full: '9999px',
};

export const defaultSpace: DesignTokens['space'] = {
  '0': '0',
  'px': '1px',
  '0_5': '0.125rem',
  '1': '0.25rem',
  '1_5': '0.375rem',
  '2': '0.5rem',
  '2_5': '0.625rem',
  '3': '0.75rem',
  '4': '1rem',
  '6': '1.5rem',
  '8': '2rem',
  '9': '2.25rem',
  '10': '2.25rem',
  '12': '3rem',
  '14': '3.5rem',
  '16': '4rem',
  '20': '5rem',
  '24': '6rem',
  '48': '12rem',
};

export const defaultTypography: DesignTokens['typography'] = {
  fontFamily:
    '-apple-system, BlinkMacSystemFont, Roboto, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
  webFont: '',
  fontWeight: {
    regular: '400',
    medium: '500',
    strong: '700',
  },
  text: {
    xs: { size: '0.75rem', height: '1rem' },
    sm: { size: '0.875rem', height: '1.25rem' },
    base: { size: '1rem', height: '1.5rem' },
    md: { size: '1rem', height: '1.5rem' },
    lg: { size: '1.125rem', height: '1.75rem' },
    xl: { size: '1.25rem', height: '1.75rem' },
  },
};
