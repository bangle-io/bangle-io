import type { Theme } from '@unocss/preset-mini';

import { vars } from '@bangle.io/css-vars';

const toneColors: Array<[string, string]> = [
  ...Object.entries(vars.color)
    .flatMap(([k, v]) =>
      Object.entries(v).map(([kk, vv]): [string, string] => [
        `color${firstCharUpperCase(k)}${firstCharUpperCase(kk)}`,
        vv,
      ]),
    )
    .sort(([a], [b]) => a.localeCompare(b)),
];

// neutral tone has a shorthand, which allows you to omit neutral
const neutralShorthand: Array<[string, string]> = Object.entries(
  vars.color.neutral,
).map(([k, v]): [string, string] => [`color${firstCharUpperCase(k)}`, v]);

let allColors = [...toneColors, ...neutralShorthand].sort(([a], [b]) =>
  a.localeCompare(b),
);
export const colors: Theme['colors'] = Object.fromEntries(allColors);

if (Object.keys(colors).length !== allColors.length) {
  throw new Error('Duplicate colors');
}

function firstCharUpperCase(str: string): string {
  return str[0]?.toUpperCase() + str.slice(1);
}
