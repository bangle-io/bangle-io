import type { DesignTokens } from '@bangle.io/shared-types';

import { spectrumDarkest, spectrumLight } from './spectrum';

export const darkNeutralColor: DesignTokens['color']['neutral'] = {
  bgLayerTop: spectrumDarkest.gray100,
  bgLayerMiddle: spectrumDarkest.gray75,
  bgLayerBottom: spectrumDarkest.gray50,
  bgLayerFloat: spectrumDarkest.gray100,

  // https://spectrum.adobe.com/page/color-system/#Gray-text
  text: spectrumDarkest.gray800,
  textDisabled: spectrumDarkest.gray500,
  textFieldBg: spectrumDarkest.gray50,
  textFieldBorder: spectrumDarkest.gray500,
  textFieldText: spectrumDarkest.gray800,
  textInverted: spectrumDarkest.gray50,
  textStrong: spectrumDarkest.gray900,
  textSubdued: spectrumDarkest.gray700,

  iconDisabled: spectrumDarkest.gray400,
  iconSubdued: spectrumDarkest.gray700,
  icon: spectrumDarkest.gray800,

  solid: spectrumDarkest.gray700,
  solidText: spectrumDarkest.gray50,
  solidStrong: spectrumDarkest.gray800,
  solidStronger: spectrumDarkest.gray900,
  solidSubdued: spectrumDarkest.gray400,
  solidFaint: spectrumDarkest.gray300,

  borderSubdued: spectrumDarkest.gray200,
  border: spectrumDarkest.gray300,
  borderStrong: spectrumDarkest.gray400,
};

export const darkColors: DesignTokens['color'] = {
  neutral: darkNeutralColor,

  secondary: {
    iconDisabled: spectrumDarkest.gray400,
    iconSubdued: spectrumDarkest.gray700,
    icon: spectrumDarkest.gray800,

    solid: spectrumDarkest.gray300,
    solidText: spectrumDarkest.gray700,
    solidStrong: spectrumDarkest.gray400,
    solidStronger: spectrumDarkest.gray500,
    solidSubdued: spectrumDarkest.gray200,
    solidFaint: spectrumDarkest.gray100,

    borderSubdued: spectrumDarkest.gray200,
    border: spectrumDarkest.gray300,
    borderStrong: spectrumDarkest.gray400,
  },

  caution: {
    iconDisabled: spectrumDarkest.orange400,
    iconSubdued: spectrumDarkest.orange700,
    icon: spectrumDarkest.orange800,

    solid: spectrumDarkest.orange900,
    solidText: darkNeutralColor.text,
    solidStrong: spectrumDarkest.orange1000,
    solidStronger: spectrumDarkest.orange1100,
    solidSubdued: spectrumDarkest.gray800,
    solidFaint: spectrumDarkest.orange300,

    borderSubdued: spectrumDarkest.orange600,
    border: spectrumDarkest.orange700,
    borderStrong: spectrumDarkest.orange800,
  },

  critical: {
    iconDisabled: spectrumDarkest.red400,
    iconSubdued: spectrumDarkest.red700,
    icon: spectrumDarkest.red800,

    solid: spectrumDarkest.red800,
    solidText: darkNeutralColor.text,
    solidStrong: spectrumDarkest.red900,
    solidStronger: spectrumDarkest.red1000,
    solidSubdued: spectrumDarkest.red700,
    solidFaint: spectrumDarkest.red200,

    borderSubdued: spectrumDarkest.red600,
    border: spectrumDarkest.red700,
    borderStrong: spectrumDarkest.red800,
  },

  positive: {
    iconDisabled: spectrumDarkest.green400,
    iconSubdued: spectrumDarkest.green700,
    icon: spectrumDarkest.green800,

    solid: spectrumDarkest.green900,
    solidText: darkNeutralColor.text,
    solidStrong: spectrumDarkest.green1000,
    solidStronger: spectrumDarkest.green1100,
    solidSubdued: spectrumDarkest.green800,
    solidFaint: spectrumDarkest.green400,

    borderSubdued: spectrumDarkest.green600,
    border: spectrumDarkest.green700,
    borderStrong: spectrumDarkest.green800,
  },
  promote: {
    iconDisabled: spectrumDarkest.magenta400,
    iconSubdued: spectrumDarkest.magenta700,
    icon: spectrumDarkest.magenta800,

    solid: spectrumDarkest.magenta800,
    solidText: darkNeutralColor.text,
    solidStrong: spectrumDarkest.magenta900,
    solidStronger: spectrumDarkest.magenta1000,
    solidSubdued: spectrumDarkest.magenta700,
    solidFaint: spectrumDarkest.magenta300,

    borderSubdued: spectrumDarkest.magenta600,
    border: spectrumDarkest.magenta700,
    borderStrong: spectrumDarkest.magenta800,
  },
};
