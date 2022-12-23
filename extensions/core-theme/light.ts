import type { BangleThemeColorInput } from '@bangle.io/shared-types';

import { color } from './colors';
import { spectrumLight } from './spectrum-light';

const brandAccent = 'rgb(88, 204, 240)';
const brandAccentLight = 'rgb(136, 223, 250)';

const caution = color.orange;
const critical = color.red;
const info = color.blue;
const positive = color.green;
const neutral = color.neutral;
const link = color.indigo;
const promote = color.purple;

const LIGHT = 700;
const REG = 900;
const BG_REG = 700;
const BG_LIGHT = 100;

export const lightColors: BangleThemeColorInput = {
  neutral: {
    bgLayer2: spectrumLight.gray50,
    bgLayer1: spectrumLight.gray100,
    bg: spectrumLight.gray200,

    textDisabled: spectrumLight.gray500,
    textLight: spectrumLight.gray700,
    text: spectrumLight.gray800,
    textDark: spectrumLight.gray900,
    textInverted: spectrumLight.gray50,

    iconDisabled: color.neutral[LIGHT],
    iconLight: color.neutral[LIGHT],
    icon: color.neutral[REG],

    btn: spectrumLight.gray800,
    btnHover: spectrumLight.gray900,
    btnDown: spectrumLight.gray900,
    btnDisabled: spectrumLight.gray200,

    borderLight: spectrumLight.gray200,
    border: spectrumLight.gray300,
    borderDark: spectrumLight.gray400,
    borderDarker: spectrumLight.gray600,
  },
  caution: {
    iconDisabled: color.neutral[LIGHT],
    iconLight: color.neutral[LIGHT],
    icon: color.neutral[REG],

    btn: 'green',
    btnHover: 'green',
    btnDown: 'green',
    btnDisabled: 'grey',

    borderLight: 'green',
    border: 'green',
    borderDark: 'green',
    borderDarker: 'green',
  },
  critical: {
    iconDisabled: color.neutral[LIGHT],
    iconLight: color.neutral[LIGHT],
    icon: color.neutral[REG],

    btn: 'green',
    btnHover: 'green',
    btnDown: 'green',
    btnDisabled: 'grey',

    borderLight: 'green',
    border: 'green',
    borderDark: 'green',
    borderDarker: 'green',
  },
  info: {
    iconDisabled: color.neutral[LIGHT],
    iconLight: color.neutral[LIGHT],
    icon: color.neutral[REG],

    btn: 'green',
    btnHover: 'green',
    btnDown: 'green',
    btnDisabled: 'grey',

    borderLight: 'green',
    border: 'green',
    borderDark: 'green',
    borderDarker: 'green',
  },
  positive: {
    iconDisabled: color.neutral[LIGHT],
    iconLight: color.neutral[LIGHT],
    icon: color.neutral[REG],

    btn: 'green',
    btnHover: 'green',
    btnDown: 'green',
    btnDisabled: 'grey',

    borderLight: 'green',
    border: 'green',
    borderDark: 'green',
    borderDarker: 'green',
  },
  promote: {
    iconDisabled: color.neutral[LIGHT],
    iconLight: color.neutral[LIGHT],
    icon: color.neutral[REG],

    btn: 'green',
    btnHover: 'green',
    btnDown: 'green',
    btnDisabled: 'grey',

    borderLight: 'green',
    border: 'green',
    borderDark: 'green',
    borderDarker: 'green',
  },
};
