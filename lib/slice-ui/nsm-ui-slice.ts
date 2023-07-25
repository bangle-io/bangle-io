import type { ColorScheme, CorePalette } from '@bangle.io/constants';
import {
  COLOR_SCHEMA,
  colorSchema,
  GENERIC_ERROR_MODAL_NAME,
} from '@bangle.io/constants';
import {
  cleanup,
  effect,
  slice,
  sliceStateSerializer,
  z,
} from '@bangle.io/nsm-3';
import type { GenericErrorModalMetadata } from '@bangle.io/shared-types';
import {
  changeColorScheme,
  checkWidescreen,
  listenToResize,
  setRootWidescreenClass,
} from '@bangle.io/utils';

import type { UISliceState } from './constants';
import { initialUISliceState } from './constants';

export const nsmUISlice = slice([], {
  name: 'bangle/ui-slice-main',
  state: initialUISliceState,
});

export const toggleSideBar = nsmUISlice.action(function toggleSideBar(
  _type?: string,
) {
  return nsmUISlice.tx((state) => {
    return nsmUISlice.update(state, (sliceState) => {
      let type = _type === undefined ? sliceState.sidebar : _type;

      return {
        sidebar: sliceState.sidebar === type ? undefined : type,
      };
    });
  });
});

export const changeSidebar = nsmUISlice.simpleAction('sidebar');

export const closeSidebar = nsmUISlice.action(function closeSidebar() {
  return nsmUISlice.tx((state) => {
    return nsmUISlice.update(state, () => {
      return {
        sidebar: undefined,
      };
    });
  });
});

export const updatePalette = nsmUISlice.action(function updatePalette(
  type: CorePalette | undefined,
  initialQuery?: string,
) {
  return nsmUISlice.tx((state) => {
    return nsmUISlice.update(state, () => {
      return {
        paletteType: type,
        paletteInitialQuery: initialQuery,
      };
    });
  });
});

export const togglePalette = nsmUISlice.simpleAction(
  'paletteType',
  (val, state) => {
    const sliceState = nsmUISlice.get(state);

    return {
      paletteType: sliceState.paletteType === val ? undefined : val,
      paletteInitialQuery: undefined,
    };
  },
);

export const resetPalette = nsmUISlice.action(function resetPalette() {
  return nsmUISlice.tx((state) => {
    return nsmUISlice.update(state, () => {
      return {
        paletteType: undefined,
        paletteInitialQuery: '',
        paletteMetadata: {},
      };
    });
  });
});

export const toggleColorSchema = nsmUISlice.action(
  function toggleColorSchema() {
    return nsmUISlice.tx((state) => {
      return nsmUISlice.update(state, (sliceState) => {
        const schema: ColorScheme =
          sliceState.colorScheme === COLOR_SCHEMA.DARK
            ? COLOR_SCHEMA.LIGHT
            : COLOR_SCHEMA.DARK;

        return {
          colorScheme: schema,
        };
      });
    });
  },
);

export const updateColorSchema = nsmUISlice.simpleAction('colorScheme');

export const updateWidescreen = nsmUISlice.simpleAction('widescreen');

export const showDialog = nsmUISlice.action(function showDialog(value: {
  dialogName: string;
  metadata?: { [key: string]: any };
}) {
  return nsmUISlice.tx((state) => {
    return nsmUISlice.update(state, () => {
      return {
        dialogName: value.dialogName,
        dialogMetadata: value.metadata,
      };
    });
  });
});

export const dismissDialog = nsmUISlice.simpleAction(
  'dialogName',
  (dialogName, state) => {
    const sliceState = nsmUISlice.get(state);

    // if a name is provided only close dialog if it matches the name
    if (typeof dialogName === 'string') {
      if (dialogName === sliceState.dialogName) {
        return {
          dialogName: undefined,
          dialogMetadata: undefined,
        };
      } else {
        return sliceState;
      }
    }

    // else close any dialog

    return {
      dialogName: undefined,
      dialogMetadata: undefined,
    };
  },
);

export const updateNoteSidebar = nsmUISlice.simpleAction('noteSidebar');

export const updateChangelogHasUpdates = nsmUISlice.simpleAction(
  'changelogHasUpdates',
);

export const toggleNoteSidebar = nsmUISlice.action(
  function toggleNoteSidebar() {
    return nsmUISlice.tx((state) => {
      return nsmUISlice.update(state, (sliceState) => ({
        noteSidebar: !sliceState.noteSidebar,
      }));
    });
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

const uiSliceMountEffect = effect((store) => {
  const syncWidescreen = (dimensions?: { width: number; height: number }) => {
    const currentWideScreen = checkWidescreen(dimensions?.width);

    const stateWidescreen = nsmUISlice.get(store.state).widescreen;

    if (currentWideScreen !== stateWidescreen) {
      store.dispatch(updateWidescreen(currentWideScreen));
    }
  };

  syncWidescreen();

  const controller = new AbortController();

  listenToResize(syncWidescreen, controller.signal);

  cleanup(store, () => {
    controller.abort();
  });
});

const setWidescreenEffect = effect(
  (store) => {
    const { widescreen } = nsmUISlice.track(store);
    setRootWidescreenClass(widescreen);
  },
  {
    deferred: false,
  },
);

const setColorSchemeEffect = effect(
  (store) => {
    const { colorScheme } = nsmUISlice.track(store);
    changeColorScheme(colorScheme);
  },
  {
    deferred: false,
  },
);

export const uiEffects = [
  uiSliceMountEffect,
  setWidescreenEffect,
  setColorSchemeEffect,
];

const SERIAL_VERSION = 1;

export const persistState = sliceStateSerializer(nsmUISlice, {
  dbKey: 'nsmUiSlice',
  schema: z.object({
    sidebar: z.union([z.string(), z.undefined()]),
    colorScheme: colorSchema,
    noteSidebar: z.boolean(),
  }),
  serialize: (state) => {
    const { sidebar, colorScheme, noteSidebar } = nsmUISlice.get(state);

    return {
      version: SERIAL_VERSION,
      data: {
        sidebar: sidebar === null ? undefined : sidebar,
        colorScheme,
        noteSidebar: noteSidebar,
      },
    };
  },
  deserialize: ({ version, data }) => {
    if (version < SERIAL_VERSION) {
      return initialUISliceState;
    }

    const result: UISliceState = {
      ...initialUISliceState,
      ...data,
    };

    return result;
  },
});
