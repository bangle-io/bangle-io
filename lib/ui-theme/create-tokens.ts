import { darken, lighten } from 'polished';

import type { BangleThemeInput, DesignTokens } from '@bangle.io/shared-types';

import {
  defaultApp,
  defaultBorder,
  defaultRingWidth,
  defaultSize,
  defaultSpace,
  defaultTypography,
  WIDESCREEN_WIDTH,
} from './default-tokens';
import type { BangleAppOverrides } from './types';
import { isLight } from './utils';

const getActiveColor = (color: string) =>
  isLight(color) ? darken(0.1, color) : darken(0.05, color);

const getHoverColor = (color: string) =>
  isLight(color) ? darken(0.05, color) : lighten(0.05, color);

export function createTokens(
  theme: BangleThemeInput,
  appOverride?: BangleAppOverrides,
): DesignTokens {
  const result: Omit<DesignTokens, 'app'> = {
    theme: theme.name,
    typography: getTypography(theme.typography),
    border: getBorder(theme.border),
    // WARNING: the width cannot be provided as a dynamic
    // value, and it should always be WIDESCREEN_WIDTH
    widescreenWidth: WIDESCREEN_WIDTH,
    color: {
      foreground: getForegroundColor(theme.foregroundColor),
      background: getBackgroundColor(theme.backgroundColor),
    },
    space: defaultSpace,
    size: defaultSize,
    ringWidth: theme.ringWidth || defaultRingWidth,
  };

  return {
    ...result,
    app: getAppOverrides(result, appOverride),
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
  designTokens: Omit<DesignTokens, 'app'>,
  input?: BangleAppOverrides,
): DesignTokens['app'] {
  const base: Record<string, Record<string, string>> = {
    ...defaultApp(designTokens),
  };

  // do a two level merge
  for (const [key, valObj] of Object.entries(input || {})) {
    base[key] = { ...base[key], ...valObj };
  }

  return base as DesignTokens['app'];
}

function getForegroundColor(
  input: BangleThemeInput['foregroundColor'],
): DesignTokens['color']['foreground'] {
  const {
    brandAccent,
    brandAccentLight,
    caution,
    cautionLight,
    critical,
    criticalLight,
    info,
    infoLight,
    link,
    linkHover,
    linkLight,
    linkVisited,
    neutral,
    neutralInverted,
    neutralLight,
    positive,
    positiveLight,
    primary,
    primaryInverted,
    primaryLight,
    promote,
    promoteLight,
    secondary,
    secondaryInverted,
    secondaryLight,
  } = input;

  return {
    brandAccent,
    brandAccentLight,
    caution,
    cautionLight,
    critical,
    criticalLight,
    info,
    infoLight,
    link,
    linkHover,
    linkLight,
    linkVisited,
    neutral,
    neutralInverted,
    neutralLight,
    positive,
    positiveLight,
    primary,
    primaryInverted,
    primaryLight,
    promote,
    promoteLight,
    secondary,
    secondaryInverted,
    secondaryLight,
  };
}

function getBorder(input: BangleThemeInput['border']): DesignTokens['border'] {
  const { width = defaultBorder.width } = input || {};

  return {
    ...defaultBorder,
    width,
  };
}

function getTypography(
  input: BangleThemeInput['typography'],
): DesignTokens['typography'] {
  const finalTypography: DesignTokens['typography'] = {
    ...defaultTypography,
    ...input,
  };

  return finalTypography;
}
