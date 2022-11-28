import type { BangleThemeInput } from '@bangle.io/shared-types';
import { getFromPath, vars, walkObject } from '@bangle.io/ui-vars';

import { createTokens } from './create-tokens';
import type { BangleAppOverrides } from './types';

export function createStyleSheet(
  theme: BangleThemeInput,
  appOverride?: BangleAppOverrides,
) {
  const tokens = createTokens(theme, appOverride);

  let result: Array<[string, string]> = [];

  walkObject(vars, (value, path) => {
    if (!value.startsWith('var(') && !value.endsWith(')')) {
      throw new Error('Invalid value ' + value);
    }

    let property = value.slice('var('.length, -1);

    value = getFromPath(tokens, path);

    result.push([property, value]);
  });

  return `
/* WARNING: This is autogenerated do not modify! */
/* stylelint-disable */
:root {
${result.map(([property, value]) => `  ${property}: ${value};`).join('\n')} 
}

/* WARNING: This is autogenerated do not modify! */
/* stylelint-enable */
`.trim();
}
