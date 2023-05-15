import type { ColorScheme, CorePalette } from '@bangle.io/constants';
import { COLOR_SCHEMA, GENERIC_ERROR_MODAL_NAME } from '@bangle.io/constants';
import { createSliceV2 } from '@bangle.io/nsm';
import type { GenericErrorModalMetadata } from '@bangle.io/shared-types';
import {
  changeColorScheme,
  checkWidescreen,
  setRootWidescreenClass,
} from '@bangle.io/utils';

import type { UISliceState } from './constants';
import { initialUISliceState } from './constants';

export const nsmUISlice = createSliceV2([], {
  name: 'bangle/ui-slice-main',
  initState: initialUISliceState,
});

export const toggleSideBar = nsmUISlice.createAction(
  'toggleSideBar',
  (_type?: string) => {
    return (state): UISliceState => {
      // use the current state to toggle
      let type = _type === undefined ? state.sidebar : _type;

      return {
        ...state,
        sidebar: state.sidebar === type ? undefined : type,
      };
    };
  },
);

export const changeSidebar = nsmUISlice.createAction(
  'changeSidebar',
  (type: string) => {
    return (state): UISliceState => {
      return {
        ...state,
        sidebar: type,
      };
    };
  },
);

export const closeSidebar = nsmUISlice.createAction('closeSidebar', () => {
  return (state): UISliceState => {
    return {
      ...state,
      sidebar: undefined,
    };
  };
});

export const updatePalette = nsmUISlice.createAction(
  'updatePalette',
  (type: CorePalette | undefined, initialQuery?: string) => {
    return (state): UISliceState => {
      return {
        ...state,
        paletteType: type,
        paletteInitialQuery: initialQuery,
      };
    };
  },
);

export const togglePalette = nsmUISlice.createAction(
  'togglePalette',
  (type: CorePalette) => {
    return (state): UISliceState => {
      return {
        ...state,
        paletteType: state.paletteType === type ? undefined : type,
        paletteInitialQuery: undefined,
      };
    };
  },
);

export const resetPalette = nsmUISlice.createAction('resetPalette', () => {
  return (state): UISliceState => {
    return {
      ...state,
      paletteType: undefined,
      paletteInitialQuery: '',
      paletteMetadata: {},
    };
  };
});

export const toggleColorSchema = nsmUISlice.createAction(
  'toggleColorSchema',
  () => {
    return (state): UISliceState => {
      const schema: ColorScheme =
        state.colorScheme === COLOR_SCHEMA.DARK
          ? COLOR_SCHEMA.LIGHT
          : COLOR_SCHEMA.DARK;

      changeColorScheme(schema);

      return {
        ...state,
        colorScheme: schema,
      };
    };
  },
);

export const updateColorSchema = nsmUISlice.createAction(
  'updateColorSchema',
  (colorScheme: ColorScheme) => {
    return (state): UISliceState => {
      changeColorScheme(colorScheme);

      return {
        ...state,
        colorScheme,
      };
    };
  },
);

export const updateWindowSize = nsmUISlice.createAction(
  'updateWindowSize',
  (windowSize: { height: number; width: number }) => {
    return (state): UISliceState => {
      const widescreen = checkWidescreen(windowSize.width);
      setRootWidescreenClass(widescreen);

      return {
        ...state,
        widescreen,
      };
    };
  },
);

export const showDialog = nsmUISlice.createAction(
  'showDialog',
  (value: { dialogName: string; metadata?: { [key: string]: any } }) => {
    return (state): UISliceState => {
      return {
        ...state,
        dialogName: value.dialogName,
        dialogMetadata: value.metadata,
      };
    };
  },
);

export const dismissDialog = nsmUISlice.createAction('dismissDialog', () => {
  return (state): UISliceState => {
    return {
      ...state,
      dialogName: undefined,
      dialogMetadata: undefined,
    };
  };
});

export const updateNoteSidebar = nsmUISlice.createAction(
  'updateNoteSidebar',
  (value: { visible: boolean }) => {
    return (state): UISliceState => {
      return {
        ...state,
        noteSidebar: value.visible,
      };
    };
  },
);

export const toggleNoteSidebar = nsmUISlice.createAction(
  'toggleNoteSidebar',
  () => {
    return (state): UISliceState => {
      return {
        ...state,
        noteSidebar: !state.noteSidebar,
      };
    };
  },
);

export function showGenericErrorModal({
  title,
  description,
}: GenericErrorModalMetadata) {
  return showDialog({
    dialogName: GENERIC_ERROR_MODAL_NAME,
    metadata: {
      title,
      description,
    },
  });
}
