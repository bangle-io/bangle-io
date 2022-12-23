import type { BangleThemeColorInput } from '@bangle.io/shared-types';

import { color } from './colors';
import { spectrumDarkest } from './spectrum-darkest';

const brandAccent = 'rgb(88, 204, 240)';
const brandAccentLight = 'rgb(136, 223, 250)';

// const caution =spectrumDarkest.orange;
const critical = color.red;
const info = color.blue;
const positive = color.green;
const link = color.indigo;
const promote = color.purple;

const LIGHT = 700;
const REG = 900;
const BG_REG = 700;
const BG_LIGHT = 100;

export const darkColors: BangleThemeColorInput = {
  neutral: {
    bgLayer2: spectrumDarkest.gray100,
    bgLayer1: spectrumDarkest.gray75,
    bg: spectrumDarkest.gray50,

    textDisabled: spectrumDarkest.gray500,
    textLight: spectrumDarkest.gray700,
    text: spectrumDarkest.gray800,
    textDark: spectrumDarkest.gray900,
    textInverted: spectrumDarkest.gray50,

    iconDisabled: spectrumDarkest.gray400,
    iconLight: spectrumDarkest.gray700,
    icon: spectrumDarkest.gray800,

    btn: spectrumDarkest.gray400,
    btnHover: spectrumDarkest.gray300,
    btnDown: spectrumDarkest.gray200,
    btnDisabled: spectrumDarkest.gray200,

    borderLight: spectrumDarkest.gray200,
    border: spectrumDarkest.gray300,
    borderDark: spectrumDarkest.gray400,
    borderDarker: spectrumDarkest.gray600,
  },
  caution: {
    iconDisabled: spectrumDarkest[LIGHT],
    iconLight: spectrumDarkest[LIGHT],
    icon: spectrumDarkest[REG],

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
    iconDisabled: spectrumDarkest[LIGHT],
    iconLight: spectrumDarkest[LIGHT],
    icon: spectrumDarkest[REG],

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
    iconDisabled: spectrumDarkest[LIGHT],
    iconLight: spectrumDarkest[LIGHT],
    icon: spectrumDarkest[REG],

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
    iconDisabled: spectrumDarkest[LIGHT],
    iconLight: spectrumDarkest[LIGHT],
    icon: spectrumDarkest[REG],

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
    iconDisabled: spectrumDarkest[LIGHT],
    iconLight: spectrumDarkest[LIGHT],
    icon: spectrumDarkest[REG],

    btn: 'green',
    btnHover: 'green',
    btnDown: 'green',
    btnDisabled: 'black',

    borderLight: 'green',
    border: 'green',
    borderDark: 'green',
    borderDarker: 'green',
  },
};
