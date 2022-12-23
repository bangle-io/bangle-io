import { getFromPath, vars, walkObject } from '@bangle.io/atomic-css';
import type { BangleThemeInput, DesignTokens } from '@bangle.io/shared-types';

import { createTokens } from './create-tokens';
import type { BangleAppOverrides } from './types';

if (typeof window !== 'undefined') {
  // This package is only meant to be used for creating stylesheets in node.js
  throw new Error('This file should not be imported in browser');
}

export function createStyleSheet(
  theme: BangleThemeInput,
  appOverride?: BangleAppOverrides,
) {
  if ('light' in theme.color && !('dark' in theme.color)) {
    throw new Error('theme color must have both light and dark or none');
  }

  if ('dark' in theme.color && !('light' in theme.color)) {
    throw new Error('theme color must have both light and dark or none');
  }

  const tokens = createTokens(theme, appOverride);

  if (!Array.isArray(tokens)) {
    return wrapVarsCss(':root', cssVarsToStrArray(convertTokensToVars(tokens)));
  }

  const common = new Set<string>();

  const lightVarsSet = new Set(
    cssVarsToStrArray(
      convertTokensToVars(tokens.find((t) => t.uid.endsWith('-light'))!),
    ),
  );

  const darkVarsSet = new Set(
    cssVarsToStrArray(
      convertTokensToVars(tokens.find((t) => t.uid.endsWith('-dark'))!),
    ),
  );

  let lightVars: string[] = [];

  lightVarsSet.forEach((item) => {
    if (darkVarsSet.has(item)) {
      common.add(item);
    } else {
      lightVars.push(item);
    }
  });

  let darkVars: string[] = [];

  darkVarsSet.forEach((item) => {
    if (lightVarsSet.has(item)) {
      common.add(item);
    } else {
      darkVars.push(item);
    }
  });

  let str = '';

  str += wrapVarsCss(':root', [...common]) + '\n\n';
  str +=
    wrapVarsCss(".light-theme, html[data-theme='light']", [...lightVars]) +
    '\n\n';

  str +=
    wrapVarsCss(".dark-theme, html[data-theme='dark']", [...darkVars]) + '\n\n';

  return str;
}

function cssVarsToStrArray(vars: Array<[string, string]>) {
  return vars.map(([property, value]) => `  ${property}: ${value};`);
}

function convertTokensToVars(_tokens: DesignTokens): Array<[string, string]> {
  let tokens = _tokens;
  let result: Array<[string, string]> = [];

  walkObject(vars, (value, path) => {
    if (!value.startsWith('var(') && !value.endsWith(')')) {
      throw new Error('Invalid value ' + value);
    }

    let property = value.slice('var('.length, -1);

    value = getFromPath(tokens, path);

    // remove uid from tokens as it does  have any use in css vars
    if (!property.endsWith('-uid')) {
      result.push([property, value]);
    }
  });

  return result;
}

function wrapVarsCss(header: string, cssVars: string[]) {
  return `/* WARNING: This is autogenerated do not modify! */
/* stylelint-disable */
${header} {
  ${cssVars.join('\n')}
}
/* stylelint-enable */`.trim();
}
