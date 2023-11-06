import type { Theme } from '@unocss/preset-mini';

import { vars } from '@bangle.io/css-vars';

export const fontFamily = vars.typography.fontFamily;

export const fontSize: Theme['fontSize'] = Object.fromEntries(
  Object.entries(vars.typography.text).map(([k, v]) => [k, [v.size, v.height]]),
);
