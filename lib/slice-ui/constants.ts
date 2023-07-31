import { IS_STORYBOOK, SPLIT_SCREEN_MIN_WIDTH } from '@bangle.io/config';
import type { ColorScheme, CorePalette } from '@bangle.io/constants';
import { COLOR_SCHEMA } from '@bangle.io/constants';
import { checkWidescreen, isMobile } from '@bangle.io/utils';

export interface UISliceState {
  changelogHasUpdates: boolean;
  dialogName?: string | null;
  dialogMetadata?: undefined | { [key: string]: any };
  noteSidebar: boolean;
  paletteInitialQuery?: string | null;
  paletteMetadata?: any | null;
  paletteType?: CorePalette | null;
  sidebar?: string | null;
  colorScheme: ColorScheme;
  widescreen: boolean;
}

// TODO this is duplicated from utils, we were getting error of using it before it was defined
// const checkWidescreen = (
//   width = typeof window !== 'undefined' ? window.innerWidth : undefined,
// ) => {
//   if (isMobile) {
//     return false;
//   }

//   return width ? SPLIT_SCREEN_MIN_WIDTH <= width : false;
// };

export const initialUISliceState: UISliceState = {
  changelogHasUpdates: false,
  dialogName: undefined,
  dialogMetadata: undefined,
  noteSidebar: false,
  paletteInitialQuery: undefined,
  paletteMetadata: undefined,
  paletteType: undefined,
  sidebar: undefined,
  colorScheme: getThemePreference(),
  widescreen: checkWidescreen(),
};

function getThemePreference() {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return COLOR_SCHEMA.LIGHT;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? COLOR_SCHEMA.DARK
    : COLOR_SCHEMA.LIGHT;
}
