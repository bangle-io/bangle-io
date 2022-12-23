import type { BangleThemeColorInput } from '@bangle.io/shared-types';

import { color } from './colors';
import { spectrumLight } from './spectrum-light';

const LIGHT = 700;
const REG = 900;

const neutralColor: BangleThemeColorInput['neutral'] = {
  bgLayerTop: spectrumLight.gray50,
  bgLayerMiddle: spectrumLight.gray100,
  bgLayerBottom: spectrumLight.gray200,
  bgLayerFloat: spectrumLight.gray75,

  textDisabled: spectrumLight.gray500,
  textLight: spectrumLight.gray700,
  text: spectrumLight.gray800,
  textDark: spectrumLight.gray900,
  textInverted: spectrumLight.gray50,

  iconDisabled: color.neutral[LIGHT],
  iconLight: color.neutral[LIGHT],
  icon: color.neutral[REG],

  btn: spectrumLight.gray400,
  btnColor: spectrumLight.gray800,
  btnHover: spectrumLight.gray500,
  btnDown: spectrumLight.gray600,
  btnDisabled: spectrumLight.gray200,

  borderLight: spectrumLight.gray200,
  border: spectrumLight.gray300,
  borderDark: spectrumLight.gray400,
  borderDarker: spectrumLight.gray600,
};

export const lightColors: BangleThemeColorInput = {
  neutral: neutralColor,
  caution: {
    iconDisabled: spectrumLight.orange400,
    iconLight: spectrumLight.orange500,
    icon: spectrumLight.orange600,

    // orange base is lighter than normal
    btn: spectrumLight.orange600,
    btnColor: neutralColor.textInverted,
    btnHover: spectrumLight.orange700,
    btnDown: spectrumLight.orange800,
    btnDisabled: spectrumLight.orange300,

    borderLight: spectrumLight.orange300,
    border: spectrumLight.orange400,
    borderDark: spectrumLight.orange500,
    borderDarker: spectrumLight.orange600,
  },
  critical: {
    iconDisabled: spectrumLight.red400,
    iconLight: spectrumLight.red500,
    icon: spectrumLight.red600,

    btn: spectrumLight.red800,
    btnColor: neutralColor.textInverted,
    btnHover: spectrumLight.red900,
    btnDown: spectrumLight.red1000,
    btnDisabled: spectrumLight.red400,

    borderLight: spectrumLight.red300,
    border: spectrumLight.red400,
    borderDark: spectrumLight.red500,
    borderDarker: spectrumLight.red600,
  },

  positive: {
    iconDisabled: spectrumLight.green400,
    iconLight: spectrumLight.green500,
    icon: spectrumLight.green600,

    btn: spectrumLight.green800,
    btnColor: neutralColor.textInverted,
    btnHover: spectrumLight.green900,
    btnDown: spectrumLight.green1000,
    btnDisabled: spectrumLight.green400,

    borderLight: spectrumLight.green300,
    border: spectrumLight.green400,
    borderDark: spectrumLight.green500,
    borderDarker: spectrumLight.green600,
  },
  promote: {
    iconDisabled: spectrumLight.blue400,
    iconLight: spectrumLight.blue500,
    icon: spectrumLight.blue600,

    btn: spectrumLight.blue900,
    btnColor: neutralColor.textInverted,
    btnHover: spectrumLight.blue900,
    btnDown: spectrumLight.blue1000,
    btnDisabled: spectrumLight.blue400,

    borderLight: spectrumLight.blue300,
    border: spectrumLight.blue400,
    borderDark: spectrumLight.blue500,
    borderDarker: spectrumLight.blue600,
  },
};
