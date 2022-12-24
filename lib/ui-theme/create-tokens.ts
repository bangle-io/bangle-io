import { deepMerge } from '@bangle.io/mini-js-utils';
import type { BangleThemeInput, DesignTokens } from '@bangle.io/shared-types';

import { darkColors } from './dark-colors';
import {
  defaultBorder,
  defaultMiscTokens,
  defaultRingWidth,
  defaultSize,
  defaultSpace,
  defaultTypography,
  WIDESCREEN_WIDTH,
} from './default-tokens';
import { lightColors } from './light-colors';
import type { BangleMiscTokens } from './types';

export function createTokens(
  theme: BangleThemeInput,
  miscTokens?: BangleMiscTokens,
): DesignTokens | [DesignTokens, DesignTokens] {
  const base: Omit<DesignTokens, 'misc' | 'color' | 'uid'> = {
    theme: theme.name,
    typography: getTypography(theme.typography),
    border: getBorder(theme.border),
    // WARNING: the width cannot be provided as a dynamic
    // value, and it should always be WIDESCREEN_WIDTH
    widescreenWidth: WIDESCREEN_WIDTH,

    space: defaultSpace,
    size: defaultSize,
    ringWidth: theme.ringWidth || defaultRingWidth,
  };

  if (theme.color && 'light' in theme.color) {
    const uidLight = 'design-token::' + theme.name + '-light';
    const uidDark = 'design-token::' + theme.name + '-dark';

    const tLight = {
      ...base,
      uid: uidLight,
      color: getColors(lightColors, theme.color.light),
    };
    const tDark = {
      ...base,
      uid: uidDark,
      color: getColors(darkColors, theme.color.dark),
    };

    return [
      {
        ...tLight,
        misc: getMiscTokens(tLight, miscTokens),
      },
      {
        ...tDark,
        misc: getMiscTokens(tDark, miscTokens),
      },
    ];
  } else {
    const t = {
      ...base,
      uid: 'design-token::' + theme.name,
      color: getColors(lightColors, theme.color),
    };

    return {
      ...t,
      misc: getMiscTokens(t, miscTokens),
    };
  }
}

function getColors(
  defaultColor: DesignTokens['color'],
  input: BangleThemeInput['color'],
): DesignTokens['color'] {
  return deepMerge(defaultColor, input) as DesignTokens['color'];
}

function getMiscTokens(
  designTokens: Omit<DesignTokens, 'misc'>,
  input?: BangleMiscTokens,
): DesignTokens['misc'] {
  const base: Record<
    string,
    Record<string, string | Record<string, string>>
  > = {
    ...defaultMiscTokens(designTokens),
  };

  return deepMerge(base, input || {}) as DesignTokens['misc'];
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
