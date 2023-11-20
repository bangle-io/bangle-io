import type { Shortcut } from '@unocss/core';
import { definePreset } from '@unocss/core';
import type { PresetMiniOptions, Theme } from '@unocss/preset-mini';
import { presetWind, PresetWindOptions } from '@unocss/preset-wind';

import { rules as bangleRules } from './rules';
import { theme } from './theme';
import { variants as bangleVariants } from './variants';

export type { Theme };

export type PresetUnoOptions = PresetMiniOptions;

const shortcuts: Shortcut<Theme>[] = [
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

export const presetUno = definePreset((options: PresetWindOptions = {}) => {
  const wind = presetWind(options);
  const windShortcuts = wind.shortcuts;
  if (!Array.isArray(windShortcuts)) {
    throw new Error('Expected wind.shortcuts to be an array');
  }

  return {
    ...wind,
    name: '@bangle.io/uno-preset-bangle',
    theme,
    rules: [...wind.rules!, ...bangleRules],
    shortcuts: [...windShortcuts, ...shortcuts],
    variants: [...wind.variants!, ...bangleVariants],
  };
});

export default presetUno;
