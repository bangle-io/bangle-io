import { darken, lighten } from 'polished';

import type { BangleThemeInput, DesignTokens } from '@bangle.io/shared-types';

import {
  defaultBorder,
  defaultBreakpoints,
  defaultFocusRingSize,
  defaultRadius,
  defaultShadows,
  defaultSpace,
  defaultTypography,
} from './default-tokens';
import { isLight } from './utils';

// TODO remove this with partial
interface BangleAppOverrides {
  // mostly overrides
  editor?: {
    backgroundColor?: string;
  };
}

const getActiveColor = (color: string) =>
  isLight(color) ? darken(0.1, color) : darken(0.05, color);

const getHoverColor = (color: string) =>
  isLight(color) ? darken(0.05, color) : lighten(0.05, color);

export function createTokens(
  theme: BangleThemeInput,
  appOverride: BangleAppOverrides,
): DesignTokens {
  const result: Omit<DesignTokens, 'app'> = {
    theme: theme.name,
    typography: getTypography(theme.typography),
    border: getBorder(theme.border),
    breakpoints: theme.breakpoints || defaultBreakpoints,
    color: {
      foreground: getForegroundColor(theme.foregroundColor),
      background: getBackgroundColor(theme.backgroundColor),
    },
    space: defaultSpace,
    radius: theme.radius || defaultRadius,
    shadows: theme.shadows || defaultShadows,
    focusRingSize: defaultFocusRingSize,
  };

  return {
    ...result,
    app: getAppOverrides(appOverride, result),
  };
}

function getBackgroundColor(
  input: BangleThemeInput['backgroundColor'],
): DesignTokens['color']['background'] {
  const {
    body,
    surface,
    surfaceDark,
    brand,
    brandAccent,
    brandAccentLight,

    neutral,
    neutralLight,
    neutralSoft,

    caution,
    cautionLight,
    critical,
    criticalLight,
    info,
    infoLight,
    positive,
    positiveLight,
  } = input;

  return {
    body,
    surface,
    surfaceDark,

    brand,

    brandAccent,
    brandAccentActive: getActiveColor(brandAccent),
    brandAccentHover: getHoverColor(brandAccent),
    brandAccentLight: brandAccentLight,
    brandAccentLightActive: getActiveColor(brandAccentLight),
    brandAccentLightHover: getHoverColor(brandAccentLight),

    neutral,
    neutralActive: getActiveColor(neutral),
    neutralHover: getHoverColor(neutral),
    neutralLight: neutralLight,
    neutralLightActive: getActiveColor(neutralLight),
    neutralLightHover: getHoverColor(neutralLight),

    neutralSoft,

    caution,
    cautionActive: getActiveColor(caution),
    cautionHover: getHoverColor(caution),
    cautionLight: cautionLight,
    cautionLightActive: getActiveColor(cautionLight),
    cautionLightHover: getHoverColor(cautionLight),

    critical,
    criticalActive: getActiveColor(critical),
    criticalHover: getHoverColor(critical),
    criticalLight: criticalLight,
    criticalLightActive: getActiveColor(criticalLight),
    criticalLightHover: getHoverColor(criticalLight),

    info,
    infoActive: getActiveColor(info),
    infoHover: getHoverColor(info),
    infoLight: infoLight,
    infoLightActive: getActiveColor(infoLight),
    infoLightHover: getHoverColor(infoLight),

    positive,
    positiveActive: getActiveColor(positive),
    positiveHover: getHoverColor(positive),
    positiveLight: positiveLight,
    positiveLightActive: getActiveColor(positiveLight),
    positiveLightHover: getHoverColor(positiveLight),
  };
}

function getAppOverrides(
  input: BangleAppOverrides,
  designTokens: Omit<DesignTokens, 'app'>,
): DesignTokens['app'] {
  return {
    editor: {
      background:
        input.editor?.backgroundColor || designTokens.color.background.surface,
    },
  };
}

function getForegroundColor(
  input: BangleThemeInput['foregroundColor'],
): DesignTokens['color']['foreground'] {
  const {
    brandAccent,
    brandAccentLight,

    link,
    linkLight,
    linkHover,
    linkVisited,

    neutral,
    neutralInverted,
    neutralLight,

    secondary,
    secondaryInverted,

    promote,
    promoteLight,

    caution,
    cautionLight,
    critical,
    criticalLight,
    info,
    infoLight,
    positive,
    positiveLight,
  } = input;

  return {
    brandAccent,
    brandAccentLight,
    link,
    linkHover,
    linkLight,
    linkVisited,
    promote,
    promoteLight,
    neutral,
    neutralInverted,
    neutralLight,
    secondary,
    secondaryInverted,
    caution,
    cautionLight,
    critical,
    criticalLight,
    info,
    infoLight,
    positive,
    positiveLight,
  };
}

function getBorder(input: BangleThemeInput['border']): DesignTokens['border'] {
  const { width = defaultBorder.width, color } = input;

  const {
    neutral,
    brandAccent,
    promote,
    focus = brandAccent,
    neutralInverted,

    // the 4
    caution,
    critical,
    info,
    positive,
  } = color;

  const getLight = (color: string) => {
    return isLight(color) ? darken(0.02, color) : lighten(0.02, color);
  };

  return {
    ...defaultBorder,
    width,
    color: {
      focus,

      brandAccent,
      brandAccentLight: getLight(brandAccent),

      promote,
      promoteLight: getLight(promote),

      neutral,
      neutralInverted,
      neutralLight: getLight(neutral),

      // the 4
      caution,
      cautionLight: getLight(caution),
      critical,
      criticalLight: getLight(critical),
      info,
      infoLight: getLight(info),
      positive,
      positiveLight: getLight(positive),
    },
  };
}

function getTypography(
  input: BangleThemeInput['typography'],
): DesignTokens['typography'] {
  const finalTypography = {
    ...defaultTypography,
    ...input,
  };

  return finalTypography;
}
