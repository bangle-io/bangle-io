// This is taken from
// https://github.com/unocss/unocss/blob/ce5912677f606a425b30224257aea4901354a244/packages/preset-mini/src/_theme/default.ts#L10
import type { Theme } from '@unocss/preset-mini';
import { theme as unoTheme } from '@unocss/preset-wind';

import { colors } from './colors';
import { fontFamily, fontSize } from './font';
import { borderRadius, lineWidth, ringWidth, spacing } from './misc';
import { containers, height, maxHeight, maxWidth, width } from './size';

export const theme: Theme = {
  ...unoTheme,
  blockSize: height,
  borderRadius,
  // WARNING: custom breakpoints are not working at the moment
  // We are using widescreen variant
  // breakpoints,
  colors,
  containers,
  fontFamily,
  fontSize,
  height,
  inlineSize: width,
  lineWidth,
  maxBlockSize: maxHeight,
  maxHeight,
  maxInlineSize: maxWidth,
  maxWidth,
  minBlockSize: maxHeight,
  minHeight: maxHeight,
  minInlineSize: maxWidth,
  minWidth: maxWidth,
  ringWidth: ringWidth,
  spacing,
  width,
};
