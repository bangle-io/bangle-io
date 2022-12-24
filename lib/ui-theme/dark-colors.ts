import type { DesignTokens } from '@bangle.io/shared-types';

import { spectrumDarkest } from './spectrum';

const neutralColor: DesignTokens['color']['neutral'] = {
  bgLayerTop: spectrumDarkest.gray100,
  bgLayerMiddle: spectrumDarkest.gray75,
  bgLayerBottom: spectrumDarkest.gray50,
  bgLayerFloat: spectrumDarkest.gray100,

  // https://spectrum.adobe.com/page/color-system/#Gray-text
  textDisabled: spectrumDarkest.gray500,
  textSubdued: spectrumDarkest.gray700,
  text: spectrumDarkest.gray800,
  textStrong: spectrumDarkest.gray900,
  textInverted: spectrumDarkest.gray50,

  iconDisabled: spectrumDarkest.gray400,
  iconSubdued: spectrumDarkest.gray700,
  icon: spectrumDarkest.gray800,

  solid: spectrumDarkest.gray400,
  solidText: spectrumDarkest.gray800,
  solidStrong: spectrumDarkest.gray300,
  solidStronger: spectrumDarkest.gray200,
  solidSubdued: spectrumDarkest.gray500,
  solidFaint: spectrumDarkest.gray200,

  borderSubdued: spectrumDarkest.gray200,
  border: spectrumDarkest.gray300,
  borderStrong: spectrumDarkest.gray400,
};

const appColor: DesignTokens['color']['app'] = {
  editorBg: spectrumDarkest.gray50,
  activitybarBg: 'rgb(31, 30, 30)',
  activitybarText: spectrumDarkest.gray800,
};

export const darkColors: DesignTokens['color'] = {
  neutral: neutralColor,
  app: appColor,

  secondary: {
    iconDisabled: spectrumDarkest.gray400,
    iconSubdued: spectrumDarkest.gray700,
    icon: spectrumDarkest.gray800,

    solid: spectrumDarkest.gray300,
    solidText: spectrumDarkest.gray700,
    solidStrong: spectrumDarkest.gray200,
    solidStronger: spectrumDarkest.gray200,
    solidSubdued: spectrumDarkest.gray400,
    solidFaint: spectrumDarkest.gray200,

    borderSubdued: spectrumDarkest.gray200,
    border: spectrumDarkest.gray300,
    borderStrong: spectrumDarkest.gray400,
  },

  caution: {
    iconDisabled: spectrumDarkest.orange400,
    iconSubdued: spectrumDarkest.orange700,
    icon: spectrumDarkest.orange800,

    solid: spectrumDarkest.orange900,
    solidText: neutralColor.text,
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
    solidText: neutralColor.text,
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
    solidText: neutralColor.text,
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
    solidText: neutralColor.text,
    solidStrong: spectrumDarkest.magenta900,
    solidStronger: spectrumDarkest.magenta1000,
    solidSubdued: spectrumDarkest.magenta700,
    solidFaint: spectrumDarkest.magenta300,

    borderSubdued: spectrumDarkest.magenta600,
    border: spectrumDarkest.magenta700,
    borderStrong: spectrumDarkest.magenta800,
  },
};
