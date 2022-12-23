import type { BangleThemeColorInput } from '@bangle.io/shared-types';

import { spectrumLight } from './spectrum-light';

const LIGHT = 700;
const REG = 900;

const neutralColor: BangleThemeColorInput['neutral'] = {
  bgLayerTop: spectrumLight.gray50,
  bgLayerMiddle: spectrumLight.gray100,
  bgLayerBottom: spectrumLight.gray200,
  bgLayerFloat: spectrumLight.gray75,

  // https://spectrum.adobe.com/page/color-system/#Gray-text
  textDisabled: spectrumLight.gray500,
  textSubdued: spectrumLight.gray700,
  text: spectrumLight.gray800,
  textStrong: spectrumLight.gray900,
  textInverted: spectrumLight.gray50,

  iconDisabled: spectrumLight.gray400,
  iconSubdued: spectrumLight.gray700,
  icon: spectrumLight.gray800,

  solid: spectrumLight.gray500,
  solidText: spectrumLight.gray50,
  solidStrong: spectrumLight.gray600,
  solidStronger: spectrumLight.gray700,
  solidSubdued: spectrumLight.gray400,
  solidFaint: spectrumLight.gray300,

  borderSubdued: spectrumLight.gray200,
  border: spectrumLight.gray300,
  borderStrong: spectrumLight.gray400,
};

export const lightColors: BangleThemeColorInput = {
  neutral: neutralColor,

  secondary: {
    iconDisabled: spectrumLight.gray400,
    iconSubdued: spectrumLight.gray700,
    icon: spectrumLight.gray800,

    solid: spectrumLight.gray300,
    solidText: spectrumLight.gray800,
    solidStrong: spectrumLight.gray200,
    solidStronger: spectrumLight.gray200,
    solidSubdued: spectrumLight.gray400,
    solidFaint: spectrumLight.gray200,

    borderSubdued: spectrumLight.gray200,
    border: spectrumLight.gray300,
    borderStrong: spectrumLight.gray400,
  },

  caution: {
    iconDisabled: spectrumLight.orange400,
    iconSubdued: spectrumLight.orange700,
    icon: spectrumLight.orange800,

    // orange base is lighter than normal
    solid: spectrumLight.orange600,
    solidText: neutralColor.textInverted,
    solidStrong: spectrumLight.orange700,
    solidStronger: spectrumLight.orange800,
    solidSubdued: spectrumLight.orange500,
    solidFaint: spectrumLight.orange300,

    borderSubdued: spectrumLight.orange300,
    border: spectrumLight.orange400,
    borderStrong: spectrumLight.orange500,
  },
  critical: {
    iconDisabled: spectrumLight.red400,
    iconSubdued: spectrumLight.red700,
    icon: spectrumLight.red800,

    solid: spectrumLight.red800,
    solidText: neutralColor.textInverted,
    solidStrong: spectrumLight.red900,
    solidStronger: spectrumLight.red1000,
    solidSubdued: spectrumLight.red700,
    solidFaint: spectrumLight.red400,

    borderSubdued: spectrumLight.red300,
    border: spectrumLight.red400,
    borderStrong: spectrumLight.red500,
  },

  positive: {
    iconDisabled: spectrumLight.green400,
    iconSubdued: spectrumLight.green700,
    icon: spectrumLight.green800,

    solid: spectrumLight.green800,
    solidText: neutralColor.textInverted,
    solidStrong: spectrumLight.green900,
    solidStronger: spectrumLight.green1000,
    solidSubdued: spectrumLight.green700,
    solidFaint: spectrumLight.green400,

    borderSubdued: spectrumLight.green300,
    border: spectrumLight.green400,
    borderStrong: spectrumLight.green500,
  },
  promote: {
    iconDisabled: spectrumLight.blue400,
    iconSubdued: spectrumLight.blue700,
    icon: spectrumLight.blue800,

    solid: spectrumLight.blue900,
    solidStrong: spectrumLight.blue900,
    solidStronger: spectrumLight.blue1000,
    solidFaint: spectrumLight.blue400,
    solidSubdued: spectrumLight.blue800,
    solidText: neutralColor.textInverted,

    borderSubdued: spectrumLight.blue300,
    border: spectrumLight.blue400,
    borderStrong: spectrumLight.blue500,
  },
};
