import type { BangleThemeColorInput } from '@bangle.io/shared-types';

import { color } from './colors';
import { spectrumDarkest } from './spectrum-darkest';

const neutralColor = {
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
  btnColor: spectrumDarkest.gray800,
  btnHover: spectrumDarkest.gray300,
  btnDown: spectrumDarkest.gray200,
  btnDisabled: spectrumDarkest.gray200,

  borderLight: spectrumDarkest.gray200,
  border: spectrumDarkest.gray300,
  borderDark: spectrumDarkest.gray400,
  borderDarker: spectrumDarkest.gray600,
};
export const darkColors: BangleThemeColorInput = {
  neutral: neutralColor,

  caution: {
    iconDisabled: spectrumDarkest.gray500,
    iconLight: spectrumDarkest.gray500,
    icon: spectrumDarkest.gray300,

    btn: spectrumDarkest.orange900,
    btnColor: neutralColor.text,
    btnHover: spectrumDarkest.orange1000,
    btnDown: spectrumDarkest.orange1100,
    btnDisabled: spectrumDarkest.orange300,

    borderLight: spectrumDarkest.orange300,
    border: spectrumDarkest.orange400,
    borderDark: spectrumDarkest.orange500,
    borderDarker: spectrumDarkest.orange600,
  },

  critical: {
    iconDisabled: spectrumDarkest.red400,
    iconLight: spectrumDarkest.red500,
    icon: spectrumDarkest.red600,

    btn: spectrumDarkest.red800,
    btnColor: neutralColor.text,
    btnHover: spectrumDarkest.red900,
    btnDown: spectrumDarkest.red1000,
    btnDisabled: spectrumDarkest.red200,

    borderLight: spectrumDarkest.red300,
    border: spectrumDarkest.red400,
    borderDark: spectrumDarkest.red500,
    borderDarker: spectrumDarkest.red600,
  },

  positive: {
    iconDisabled: spectrumDarkest.green400,
    iconLight: spectrumDarkest.green500,
    icon: spectrumDarkest.green600,

    btn: spectrumDarkest.green900,
    btnColor: neutralColor.text,
    btnHover: spectrumDarkest.green1000,
    btnDown: spectrumDarkest.green1100,
    btnDisabled: spectrumDarkest.green400,

    borderLight: spectrumDarkest.green300,
    border: spectrumDarkest.green400,
    borderDark: spectrumDarkest.green500,
    borderDarker: spectrumDarkest.green600,
  },
  promote: {
    iconDisabled: spectrumDarkest.magenta400,
    iconLight: spectrumDarkest.magenta500,
    icon: spectrumDarkest.magenta600,

    btn: spectrumDarkest.magenta800,
    btnColor: neutralColor.text,
    btnHover: spectrumDarkest.magenta900,
    btnDown: spectrumDarkest.magenta1000,
    btnDisabled: spectrumDarkest.magenta300,

    borderLight: spectrumDarkest.magenta300,
    border: spectrumDarkest.magenta400,
    borderDark: spectrumDarkest.magenta500,
    borderDarker: spectrumDarkest.magenta600,
  },
};
