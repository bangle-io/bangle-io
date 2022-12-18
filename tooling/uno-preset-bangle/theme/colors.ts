import type { Theme } from '@unocss/preset-mini';

import { vars } from '@bangle.io/atomic-css';

const bgColors: Record<string, string> = Object.fromEntries([
  ...Object.entries(vars.color.background)
    .map(([k, v]): [string, string] => [
      // c stands for color
      //   bg stands for background type of color
      `bg${firstCharUpperCase(k)}`,
      v,
    ])
    .sort(([a], [b]) => a.localeCompare(b)),
]);

const fgColors: Record<string, string> = Object.fromEntries(
  Object.entries(vars.color.foreground)
    .map(([k, v]): [string, string] => [
      // c stands for color
      //   fg stands for foreground type of color
      `fg${firstCharUpperCase(k)}`,
      v,
    ])
    .sort(([a], [b]) => a.localeCompare(b)),
);

const appColor: Record<string, string> = Object.fromEntries(
  Object.entries(vars.app)
    .flatMap(([k, v]) =>
      Object.entries(v)
        .filter(([k, v]) => k?.endsWith('bgColor') || k?.endsWith('fgColor'))
        .map(([kk, vv]): [string, string] => [
          `app${firstCharUpperCase(k)}${firstCharUpperCase(kk)}`,
          vv,
        ]),
    )
    .map(([k, v]): [string, string] => [
      // c stands for color
      //   app stands for foreground type of color
      k,
      v,
    ])

    .sort(([a], [b]) => a.localeCompare(b)),
);

export const colors: Theme['colors'] = {
  ...bgColors,
  ...fgColors,
  ...appColor,
};

function firstCharUpperCase(str: string): string {
  return str[0]?.toUpperCase() + str.slice(1);
}
