import { deepMerge } from '@bangle.io/mini-js-utils';
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

export function createTokens(
  theme: BangleThemeInput,
  appOverride?: BangleAppOverrides,
): DesignTokens | [DesignTokens, DesignTokens] {
  const base: Omit<DesignTokens, 'app' | 'color' | 'uid'> = {
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

    const tLight = { ...base, uid: uidLight, color: theme.color.light };
    const tDark = { ...base, uid: uidDark, color: theme.color.dark };

    return [
      {
        ...tLight,
        app: getAppOverrides(tLight, appOverride),
      },
      {
        ...tDark,
        app: getAppOverrides(tDark, appOverride),
      },
    ];
  } else {
    const t = {
      ...base,
      uid: 'design-token::' + theme.name,
      color: theme.color,
    };

    return {
      ...t,
      app: getAppOverrides(t, appOverride),
    };
  }
}

function getAppOverrides(
  designTokens: Omit<DesignTokens, 'app'>,
  input?: BangleAppOverrides,
): DesignTokens['app'] {
  const base: Record<
    string,
    Record<string, string | Record<string, string>>
  > = {
    ...defaultApp(designTokens),
  };

  return deepMerge(base, input || {}) as DesignTokens['app'];
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
