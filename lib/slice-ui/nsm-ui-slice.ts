import type { ColorScheme, CorePalette } from '@bangle.io/constants';
import { COLOR_SCHEMA } from '@bangle.io/constants';
import { changeEffect, createSlice } from '@bangle.io/nsm';
import {
  changeColorScheme,
  checkWidescreen,
  listenToResize,
  setRootWidescreenClass,
} from '@bangle.io/utils';

import { initialUISliceState } from './ui-slice';

export const nsmUISlice = createSlice([], {
  name: '@bangle.io/ui-slice',
  initState: initialUISliceState,
  selectors: {},
  actions: {
    toggleSidebar: (type: string) => (state) => ({
      ...state,
      sidebar: Boolean(state.sidebar) ? undefined : type,
    }),
    changeSidebar: (type: string) => (state) => ({
      ...state,
      sidebar: type,
    }),
    updatePalette:
      (type: CorePalette | undefined, initialQuery?: string) => (state) => ({
        ...state,
        paletteType: type,
        paletteInitialQuery: initialQuery,
      }),

    togglePalette: (type: CorePalette) => (state) => ({
      ...state,
      paletteType: state.paletteType === type ? undefined : type,
      paletteInitialQuery: undefined,
    }),

    resetPalette: () => (state) => ({
      ...state,
      paletteType: undefined,
      paletteInitialQuery: '',
      paletteMetadata: {},
    }),

    toggleColorSchema: () => (state) => {
      const schema: ColorScheme =
        state.colorScheme === COLOR_SCHEMA.DARK
          ? COLOR_SCHEMA.LIGHT
          : COLOR_SCHEMA.DARK;
      changeColorScheme(schema);

      return {
        ...state,
        colorScheme: schema,
      };
    },

    updateColorSchema: (colorScheme: ColorScheme) => (state) => {
      changeColorScheme(colorScheme);

      return {
        ...state,
        colorScheme,
      };
    },

    updateWindowSize:
      (windowSize: { height: number; width: number }) => (state) => {
        const widescreen = checkWidescreen(windowSize.width);
        setRootWidescreenClass(widescreen);

        return {
          ...state,
          windowSize,
        };
      },

    showDialog:
      (value: {
        dialogName: string;
        metadata?: undefined | { [key: string]: any };
      }) =>
      (state) => {
        return {
          ...state,
          dialogName: value.dialogName,
          dialogMetadata: value.metadata,
        };
      },

    dismissDialog: () => (state) => {
      return {
        ...state,
        dialogName: undefined,
        dialogMetadata: undefined,
      };
    },

    updateNewChangelog: (value: { hasUpdates: boolean }) => (state) => {
      return {
        ...state,
        newChangelog: value.hasUpdates,
      };
    },

    updateNoteSidebar: (value: { visible: boolean }) => (state) => {
      return {
        ...state,
        noteSidebar: value.visible,
      };
    },

    toggleNoteSidebar: () => (state) => {
      return {
        ...state,
        noteSidebar: !state.noteSidebar,
      };
    },
  },
});

export const uiSliceEffect = changeEffect(
  '@bangle.io/ui-slice-change-effect',
  {
    colorSchema: nsmUISlice.passivePick((state) => state.colorScheme),
    widescreen: nsmUISlice.passivePick((state) => state.widescreen),
  },
  ({ colorSchema, widescreen }, dispatch) => {
    changeColorScheme(colorSchema);
    setRootWidescreenClass(widescreen);

    const controller = new AbortController();
    listenToResize((obj) => {
      dispatch(nsmUISlice.actions.updateWindowSize(obj));
    }, controller.signal);

    return () => {
      controller.abort();
    };
  },
);
