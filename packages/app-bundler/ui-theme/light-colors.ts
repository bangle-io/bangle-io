import type { DesignTokens } from '@bangle.io/shared-types';

import { spectrumLight } from './spectrum';

// https://colorbox.io/?c0=%26p%24s%24%3D11%26p%24h%24st%24%3D194%26p%24h%24e%24%3D200%26p%24h%24c%24%3Deqo%26p%24sa%24st%24%3D0.41%26p%24sa%24e%24%3D1%26p%24sa%24r%24%3D1%26p%24sa%24c%24%3Deqo%26p%24b%24st%24%3D1%26p%24b%24e%24%3D0.5%26p%24b%24c%24%3Deqti%26o%24n%24%3DBlue%26o%24ms%24%3D0%2C1%26o%24ro%24%3Dcw
const bangleAccent100 = '#96eeff';
const bangleAccent200 = '#88e9ff';
const bangleAccent300 = '#7ae4fe';
const bangleAccent400 = '#6cdffe';
const bangleAccent500 = '#5ed9fe';
const bangleAccent600 = '#46cefc';
const bangleAccent700 = '#31c3fa';
const bangleAccent800 = '#21b8f7';
const bangleAccent900 = '#15adf1';
const bangleAccent1000 = '#0ca1e6';
const bangleAccent1200 = '#058bcc';
const bangleAccent1400 = '#026da3';
const bangleAccent1500 = '#005580';

export const lightNeutralColor: DesignTokens['color']['neutral'] = {
  bgLayerTop: spectrumLight.gray100,
  bgLayerMiddle: spectrumLight.gray50,
  bgLayerBottom: spectrumLight.gray200,
  bgLayerFloat: spectrumLight.gray75,

  // https://spectrum.adobe.com/page/color-system/#Gray-text
  text: spectrumLight.gray800,
  textDisabled: spectrumLight.gray500,
  textFieldBg: spectrumLight.gray50,
  textFieldBorder: spectrumLight.gray500,
  textFieldText: spectrumLight.gray800,
  textInverted: spectrumLight.gray50,
  textStrong: spectrumLight.gray900,
  textSubdued: spectrumLight.gray700,

  iconDisabled: spectrumLight.gray400,
  iconSubdued: spectrumLight.gray700,
  icon: spectrumLight.gray800,

  solid: spectrumLight.gray700,
  solidText: spectrumLight.gray50,
  solidStrong: spectrumLight.gray800,
  solidStronger: spectrumLight.gray900,
  solidSubdued: spectrumLight.gray400,
  solidFaint: spectrumLight.gray300,

  borderSubdued: spectrumLight.gray200,
  border: spectrumLight.gray300,
  borderStrong: spectrumLight.gray400,
};

export const lightColors: DesignTokens['color'] = {
  neutral: lightNeutralColor,

  secondary: {
    iconDisabled: spectrumLight.gray400,
    iconSubdued: spectrumLight.gray700,
    icon: spectrumLight.gray800,

    solid: spectrumLight.gray400,
    solidText: spectrumLight.gray700,
    solidStrong: spectrumLight.gray500,
    solidStronger: spectrumLight.gray600,
    solidSubdued: spectrumLight.gray300,
    // is same as subdued, since 200 will hit the bglayer level
    solidFaint: spectrumLight.gray300,

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
    solidText: lightNeutralColor.textInverted,
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
    solidText: lightNeutralColor.textInverted,
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
    solidText: lightNeutralColor.textInverted,
    solidStrong: spectrumLight.green900,
    solidStronger: spectrumLight.green1000,
    solidSubdued: spectrumLight.green700,
    solidFaint: spectrumLight.green400,

    borderSubdued: spectrumLight.green300,
    border: spectrumLight.green400,
    borderStrong: spectrumLight.green500,
  },
  promote: {
    iconDisabled: bangleAccent400,
    iconSubdued: bangleAccent600,
    icon: bangleAccent700,

    solid: bangleAccent800,
    solidStrong: bangleAccent900,
    solidStronger: bangleAccent1000,
    solidFaint: bangleAccent200,
    solidSubdued: bangleAccent500,
    solidText: lightNeutralColor.textInverted,

    borderSubdued: bangleAccent400,
    border: bangleAccent600,
    borderStrong: bangleAccent700,
  },
};
