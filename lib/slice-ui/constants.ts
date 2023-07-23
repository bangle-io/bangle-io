import type { ColorScheme, CorePalette } from '@bangle.io/constants';
import { COLOR_SCHEMA } from '@bangle.io/constants';
import { checkWidescreen } from '@bangle.io/utils';

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
export const initialUISliceState: UISliceState = {
  // UI
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

export function getThemePreference() {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return COLOR_SCHEMA.LIGHT;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? COLOR_SCHEMA.DARK
    : COLOR_SCHEMA.LIGHT;
}
