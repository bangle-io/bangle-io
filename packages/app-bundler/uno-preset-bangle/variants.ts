import type { Variant } from '@unocss/core';
import type { Theme } from '@unocss/preset-wind';

const widescreen: Variant<Theme> = {
  name: 'bangle:widescreen',
  match(matcher, context) {
    if (!matcher.startsWith('widescreen:')) {
      return undefined;
    }

    return {
      matcher: matcher.slice('widescreen:'.length),
      selector: (s) => `.BU_widescreen ${s}`,
    };
  },
  multiPass: true,
  autocomplete: 'widescreen:',
};

const smallscreen: Variant<Theme> = {
  name: 'bangle:smallscreen',
  match(matcher, context) {
    if (!matcher.startsWith('smallscreen:')) {
      return undefined;
    }

    return {
      matcher: matcher.slice('smallscreen:'.length),
      selector: (s) => `.BU_smallscreen ${s}`,
    };
  },
  multiPass: true,
  autocomplete: 'smallscreen:',
};

export const variants = [widescreen, smallscreen];
