import {
  createRawVar,
  getFromPath,
  vars,
  walkObject,
} from '@bangle.io/atomic-css';
import { deepMerge, difference, intersect } from '@bangle.io/mini-js-utils';
import type {
  BangleThemeInputLightDark,
  BangleThemeInputSingle,
  DesignTokens,
} from '@bangle.io/shared-types';

import {
  defaultsDark,
  defaultsLight,
  defaultSmallScreenOverrideLightDark,
  defaultSmallScreenOverrideSingle,
} from './default-tokens';

if (typeof window !== 'undefined') {
  // This package is only meant to be used for creating stylesheets in node.js
  throw new Error('This file should not be imported in browser');
}

export const CSS_ROOT = ':root';
export const CSS_BODY = 'body';
export const CSS_SM_BODY = 'body.BU_smallscreen';
export const CSS_LIGHT_THEME = `.light-theme`;
export const CSS_SM_LIGHT_THEME = `.light-theme.BU_smallscreen`;
export const CSS_DARK_THEME = `.dark-theme`;
export const CSS_SM_DARK_THEME = `.dark-theme.BU_smallscreen`;

type CssBlocks = Record<string, string[]>;

const base = {
  [CSS_BODY]: [
    `background-color: ${vars.color.neutral.bgLayerBottom};`,
    `color: ${vars.color.neutral.text};`,
  ],
};

export function createStyleSheetObj(
  obj:
    | {
        type: 'light/dark';
        name: string;
        theme: BangleThemeInputLightDark;
        smallscreenOverride?: BangleThemeInputLightDark;
      }
    | {
        type: 'single';
        name: string;
        theme: BangleThemeInputSingle;
        smallscreenOverride?: BangleThemeInputSingle;
      },
): CssBlocks {
  let result: CssBlocks = { ...base };

  if (obj.type === 'single') {
    result = {
      ...result,
      [CSS_ROOT]: mergeWithDefaults(obj.name, defaultsLight, obj.theme),
    };

    let smOverride = deepMerge(
      defaultSmallScreenOverrideSingle,
      obj.smallscreenOverride || {},
    );

    result = {
      ...result,
      [CSS_SM_BODY]: createSmallScreenOverride(smOverride),
    };

    return result;
  }

  const { light: lightInput, dark: darkInput } = normalizeLightDarkInput(
    obj.theme,
  );

  const lightThemeVars = mergeWithDefaults(obj.name, defaultsLight, lightInput);
  const darkThemeVars = mergeWithDefaults(obj.name, defaultsDark, darkInput);

  const common = intersect(lightThemeVars, darkThemeVars);

  result = {
    ...result,
    [CSS_ROOT]: common,
    [CSS_LIGHT_THEME]: difference(lightThemeVars, common),
    [CSS_DARK_THEME]: difference(darkThemeVars, common),
  };

  let smOverride = deepMerge(
    defaultSmallScreenOverrideLightDark,
    obj.smallscreenOverride || {},
  );
  const { light: lightOverride, dark: darkOverride } =
    normalizeLightDarkInput(smOverride);

  result = {
    ...result,
    [CSS_SM_LIGHT_THEME]: createSmallScreenOverride(lightOverride),
    [CSS_SM_DARK_THEME]: createSmallScreenOverride(darkOverride),
  };

  return result;
}

function normalizeLightDarkInput(input: BangleThemeInputLightDark): {
  light: BangleThemeInputSingle;
  dark: BangleThemeInputSingle;
} {
  const { color, ...otherProps } = input;
  const { light, dark } = color || {};

  return {
    light: { ...otherProps, color: light || {} },
    dark: {
      ...otherProps,
      color: dark || {},
    },
  };
}

function mergeWithDefaults(
  name: string,
  defaultValue: DesignTokens,
  theme: BangleThemeInputSingle,
) {
  const mergedTokens = deepMerge(defaultValue, {
    theme: name,
    ...theme,
  });

  return cssVarsToStrArray(convertTokensToVars(mergedTokens));
}

export function createStyleSheet(
  obj:
    | {
        type: 'light/dark';
        name: string;
        theme: BangleThemeInputLightDark;
        smallscreenOverride?: BangleThemeInputLightDark;
      }
    | {
        type: 'single';
        name: string;
        theme: BangleThemeInputSingle;
        smallscreenOverride?: BangleThemeInputSingle;
      },
): string {
  const result = createStyleSheetObj(obj);

  return Object.entries(result).reduce((prev, cur) => {
    return (
      prev +
      '\n\n' +
      wrapVarsCss(
        cur[0],
        cur[1].map((v) => '  ' + v.trim()),
      )
    );
  }, '');
}

export function createSmallScreenOverride(override: BangleThemeInputSingle) {
  let result: Array<[string, string]> = [];

  walkObject(override as any, (value, path) => {
    if (typeof value === 'string') {
      result.push([createRawVar(path), value]);
    }
  });

  return cssVarsToStrArray(result).sort();
}

export function cssVarsToStrArray(vars: Array<[string, string]>) {
  return vars.map(([property, value]) => `${property}: ${value};`);
}

export function convertTokensToVars(
  _tokens: Record<string, any>,
): Array<[string, string]> {
  let tokens = _tokens;
  let result: Array<[string, string]> = [];

  walkObject(vars, (value, path) => {
    if (!value.startsWith('var(') && !value.endsWith(')')) {
      throw new Error('Invalid value ' + value);
    }

    let property = value.slice('var('.length, -1);

    let val = getFromPath(tokens, path);

    // remove uid from tokens as it does  have any use in css vars
    if (!property.endsWith('-uid') && typeof val === 'string') {
      result.push([property, val]);
    }
  });

  return result;
}

function wrapVarsCss(header: string, cssLines: string[]) {
  return `/* WARNING: This is autogenerated do not modify! */
/* stylelint-disable */
${header} {
  ${cssLines.join('\n')}
}
/* stylelint-enable */`.trim();
}
