import type { Preset } from '@unocss/core';
import type { PresetMiniOptions, Theme } from '@unocss/preset-mini';
import { preflights } from '@unocss/preset-mini';
import { rules, shortcuts, variants } from '@unocss/preset-wind';

import { rules as bangleRules } from './rules';
import { theme } from './theme';
import { variants as bangleVariants } from './variants';

export type { Theme };

export interface PresetUnoOptions extends PresetMiniOptions {}

export const presetUno = (options: PresetUnoOptions = {}): Preset<Theme> => {
  options.dark = options.dark ?? 'class';
  options.attributifyPseudo = options.attributifyPseudo ?? false;
  options.preflight = options.preflight ?? true;

  return {
    name: '@bangle.io/uno-preset-bangle',
    theme: theme,
    rules: [...rules, ...bangleRules],
    shortcuts,
    variants: [...variants(options), ...bangleVariants],
    options,
    preflights: options.preflight ? preflights : [],
    prefix: options.prefix,
  };
};

export default presetUno;
