import tailwindColors from 'tailwindcss/colors';

export interface ColorPalette {
  '50': string;
  '100': string;
  '200': string;
  '300': string;
  '400': string;
  '500': string;
  '600': string;
  '700': string;
  '800': string;
  '900': string;
}

export const color = {
  black: tailwindColors.black,
  green: tailwindColors.green,
  gray: tailwindColors.gray,
  neutral: tailwindColors.neutral,
  orange: tailwindColors.orange,
  red: tailwindColors.red,
  white: tailwindColors.white,
  yellow: tailwindColors.yellow,
  purple: tailwindColors.purple,
  indigo: tailwindColors.indigo,
  blue: tailwindColors.blue,
} as const;
