import type { Theme } from '@unocss/preset-mini';

import { vars } from '@bangle.io/atomic-css';

const bgColors: Record<string, string> = Object.fromEntries(
  Object.entries(vars.color.background).map(([k, v]) => [
    `bg${firstCharUpperCase(k)}`,
    v,
  ]),
);
const fgColors: Record<string, string> = Object.fromEntries(
  Object.entries(vars.color.foreground).map(([k, v]) => [
    `fg${firstCharUpperCase(k)}`,
    v,
  ]),
);

export const colors: Theme['colors'] = {
  ...bgColors,
  ...fgColors,
};

function firstCharUpperCase(str: string): string {
  return str[0]?.toUpperCase() + str.slice(1);
}
