import fs from 'node:fs';
import path from 'node:path';
import { lighten } from 'polished';

import { createStyleSheet } from '@bangle.io/ui-theme';

import { color } from './colors';

const brandAccent = 'rgb(88, 204, 240)';
const brandAccentLight = 'rgb(136, 223, 250)';

const caution = color.orange;
const critical = color.red;
const info = color.blue;
const positive = color.green;
const neutral = color.neutral;
const link = color.indigo;
const promote = color.purple;

const LIGHT = 400;
const REG = 900;
const BG_REG = 700;
const BG_LIGHT = 100;

const baseThemeLight = createStyleSheet({
  name: 'base-light',

  foregroundColor: {
    brandAccent,
    brandAccentLight,

    promote: promote[REG],
    promoteLight: promote[LIGHT],

    link: link[REG],
    linkHover: link[800],
    linkVisited: link[REG],
    linkLight: link[LIGHT],

    neutral: neutral[700],
    neutralLight: neutral[400],
    neutralInverted: color.white,

    secondary: neutral[500],
    secondaryInverted: neutral[100],

    caution: caution[REG],
    cautionLight: caution[LIGHT],
    critical: critical[REG],
    criticalLight: critical[LIGHT],
    info: info[REG],
    infoLight: info[LIGHT],
    positive: positive[REG],
    positiveLight: positive[LIGHT],
  },

  backgroundColor: {
    body: color.white,
    surface: color.gray[50],
    surfaceDark: color.gray[200],

    brand: brandAccent,

    brandAccent,
    brandAccentLight,

    neutral: neutral[100],
    neutralLight: lighten(0.02, neutral[100]),
    neutralSoft: neutral[50],

    caution: caution[BG_REG],
    cautionLight: caution[BG_LIGHT],
    critical: critical[BG_REG],
    criticalLight: critical[BG_LIGHT],
    info: info[BG_REG],
    infoLight: info[BG_LIGHT],
    positive: positive[BG_REG],
    positiveLight: positive[BG_LIGHT],
  },
});

fs.writeFileSync(
  path.join(__dirname, './theme-light.css'),
  baseThemeLight,
  'utf8',
);
