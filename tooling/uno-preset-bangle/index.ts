import type { Preset, Shortcut } from '@unocss/core';
import type { PresetMiniOptions, Theme } from '@unocss/preset-mini';
import { preflights } from '@unocss/preset-mini';
import {
  rules,
  shortcuts as windShortcuts,
  variants,
} from '@unocss/preset-wind';

import { rules as bangleRules } from './rules';
import { theme } from './theme';
import { variants as bangleVariants } from './variants';

export type { Theme };

export interface PresetUnoOptions extends PresetMiniOptions {}

export const shortcuts: Array<Shortcut<Theme>> = [
  ['z-popup', 'z-300'],
  ['z-dropdown', 'z-400'],
  ['z-modal', 'z-500'],
  ['z-tooltip', 'z-600'],
  ['z-fixed', 'z-800'],
  ['z-sticky', 'z-900'],
  [
    'ring-promote',
    'ring-2 ring-colorPromoteBorder ring-offset-2 ring-offset-colorNeutralTextInverted',
  ],
  ['border-neutral', 'border-1 border-colorNeutralBorder'],
  [
    'text-field-neutral',
    'bg-colorNeutralTextFieldBg text-colorNeutralTextFieldText',
  ],
];

export const presetUno = (options: PresetUnoOptions = {}): Preset<Theme> => {
  options.dark = options.dark ?? 'class';
  options.attributifyPseudo = options.attributifyPseudo ?? false;
  options.preflight = options.preflight ?? true;

  return {
    name: '@bangle.io/uno-preset-bangle',
    theme: theme,
    rules: [...rules, ...bangleRules],
    shortcuts: [...shortcuts, ...windShortcuts],
    variants: [...variants(options), ...bangleVariants],
    options,
    preflights: options.preflight ? preflights : [],
    prefix: options.prefix,
  };
};

export default presetUno;
