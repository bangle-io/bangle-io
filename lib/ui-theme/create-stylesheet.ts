import {
  createRawVar,
  getFromPath,
  vars,
  walkObject,
} from '@bangle.io/css-vars';
import { deepMerge, difference, intersect } from '@bangle.io/mini-js-utils';
import type {
  BangleThemeInputDualColorScheme,
  BangleThemeInputSingleScheme,
  DesignTokens,
} from '@bangle.io/shared-types';

import {
  defaultsDark,
  defaultsLight,
  defaultSmallScreenOverrideDualColorScheme,
  defaultSmallScreenOverrideSingle,
} from './default-tokens';

if (typeof window !== 'undefined') {
  // This package is only meant to be used for creating stylesheets in node.js
  throw new Error('This file should not be imported in browser');
}

export const CSS_ROOT = ':root';
export const CSS_BODY = 'body';
export const CSS_SM_BODY = 'body.BU_smallscreen';
export const CSS_LIGHT_SCHEME = `.light-scheme`;
export const CSS_SM_LIGHT_SCHEME = `.light-scheme.BU_smallscreen`;
export const CSS_DARK_SCHEME = `.dark-scheme`;
export const CSS_SM_DARK_SCHEME = `.dark-scheme.BU_smallscreen`;

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
        colorScheme: 'light/dark';
        name: string;
        theme: BangleThemeInputDualColorScheme;
        smallscreenOverride?: BangleThemeInputDualColorScheme;
      }
    | {
        colorScheme: 'single';
        name: string;
        theme: BangleThemeInputSingleScheme;
        smallscreenOverride?: BangleThemeInputSingleScheme;
      },
): CssBlocks {
  let result: CssBlocks = { ...base };

  if (obj.colorScheme === 'single') {
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

  const { light: lightInput, dark: darkInput } = normalizeDualColorSchemeInput(
    obj.theme,
  );

  const lightThemeVars = mergeWithDefaults(obj.name, defaultsLight, lightInput);
  const darkThemeVars = mergeWithDefaults(obj.name, defaultsDark, darkInput);

  const common = intersect(lightThemeVars, darkThemeVars);

  result = {
    ...result,
    [CSS_ROOT]: common,
    [CSS_LIGHT_SCHEME]: difference(lightThemeVars, common),
    [CSS_DARK_SCHEME]: difference(darkThemeVars, common),
  };

  let smOverride = deepMerge(
    defaultSmallScreenOverrideDualColorScheme,
    obj.smallscreenOverride || {},
  );
  const { light: lightOverride, dark: darkOverride } =
    normalizeDualColorSchemeInput(smOverride);

  result = {
    ...result,
    [CSS_SM_LIGHT_SCHEME]: createSmallScreenOverride(lightOverride),
    [CSS_SM_DARK_SCHEME]: createSmallScreenOverride(darkOverride),
  };

  return result;
}

function normalizeDualColorSchemeInput(
  input: BangleThemeInputDualColorScheme,
): {
  light: BangleThemeInputSingleScheme;
  dark: BangleThemeInputSingleScheme;
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
  theme: BangleThemeInputSingleScheme,
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
        colorScheme: 'light/dark';
        name: string;
        theme: BangleThemeInputDualColorScheme;
        smallscreenOverride?: BangleThemeInputDualColorScheme;
      }
    | {
        colorScheme: 'single';
        name: string;
        theme: BangleThemeInputSingleScheme;
        smallscreenOverride?: BangleThemeInputSingleScheme;
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

export function createSmallScreenOverride(
  override: BangleThemeInputSingleScheme,
) {
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
