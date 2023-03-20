import type { ColorScheme, CorePalette } from '@bangle.io/constants';
import { COLOR_SCHEMA } from '@bangle.io/constants';
import type { ApplicationStore } from '@bangle.io/create-store';
import { Slice, SliceKey } from '@bangle.io/create-store';
import {
  assertActionName,
  changeColorScheme,
  checkWidescreen,
  listenToResize,
  setRootWidescreenClass,
} from '@bangle.io/utils';

import {
  getThemePreference,
  initialUISliceState,
  UISliceState,
} from './constants';

const LOG = false;
let log = LOG ? console.log.bind(console, 'UISlice') : () => {};

export type UiContextDispatchType = ApplicationStore<
  UISliceState,
  UiContextAction
>['dispatch'];

export const UI_CONTEXT_TOGGLE_COLOR_SCHEME =
  'action::@bangle.io/slice-ui:TOGGLE_COLOR_SCHEME';

export type UiContextAction =
  | {
      name: 'action::@bangle.io/slice-ui:TOGGLE_SIDEBAR';
      value: { type: string };
    }
  | {
      name: 'action::@bangle.io/slice-ui:CHANGE_SIDEBAR';
      value: { type: string | null };
    }
  | {
      name: 'action::@bangle.io/slice-ui:UPDATE_PALETTE';
      value: {
        type: CorePalette | null;
        initialQuery?: string;
      };
    }
  | {
      name: 'action::@bangle.io/slice-ui:TOGGLE_PALETTE';
      value: {
        type: CorePalette | null;
      };
    }
  | { name: 'action::@bangle.io/slice-ui:RESET_PALETTE'; value: {} }
  | { name: typeof UI_CONTEXT_TOGGLE_COLOR_SCHEME; value: {} }
  | {
      name: 'action::@bangle.io/slice-ui:UPDATE_COLOR_SCHEME';
      value: { colorScheme: ColorScheme };
    }
  | {
      name: 'action::@bangle.io/slice-ui:UPDATE_WINDOW_SIZE';
      value: { windowSize: { height: number; width: number } };
    }
  | {
      name: 'action::@bangle.io/slice-ui:SHOW_DIALOG';
      value: {
        dialogName: string;
        metadata?: undefined | { [key: string]: any };
      };
    }
  | {
      name: 'action::@bangle.io/slice-ui:DISMISS_DIALOG';
      // pass an array to dismiss any dialog that matches with it
      value: { dialogName: undefined | string | string[] };
    }
  | {
      name: 'action::@bangle.io/slice-ui:UPDATE_NEW_CHANGELOG';
      value: { hasUpdates: boolean };
    }
  | {
      name: 'action::@bangle.io/slice-ui:UPDATE_NOTE_SIDEBAR';
      value: { visible: boolean };
    }
  | { name: 'action::@bangle.io/slice-ui:TOGGLE_NOTE_SIDEBAR'; value: {} };

export const uiSliceKey = new SliceKey<UISliceState, UiContextAction>(
  'ui-slice',
);

export function uiSlice(): Slice<UISliceState, UiContextAction> {
  assertActionName('@bangle.io/slice-ui', uiSliceKey);

  return new Slice({
    key: uiSliceKey,
    state: {
      init: () => {
        return Object.assign({}, initialUISliceState);
      },
      apply: (action, state) => {
        log({ action, state });
        switch (action.name) {
          case 'action::@bangle.io/slice-ui:TOGGLE_SIDEBAR': {
            const sidebar = Boolean(state.sidebar)
              ? undefined
              : action.value.type;

            return {
              ...state,
              sidebar,
            };
          }

          case 'action::@bangle.io/slice-ui:CHANGE_SIDEBAR': {
            return {
              ...state,
              sidebar: action.value.type,
            };
          }

          case 'action::@bangle.io/slice-ui:UPDATE_PALETTE': {
            return {
              ...state,
              paletteType: action.value.type,
              paletteInitialQuery: action.value.initialQuery,
            };
          }
          case 'action::@bangle.io/slice-ui:TOGGLE_PALETTE': {
            const { type } = action.value;

            return {
              ...state,
              paletteType: state.paletteType === type ? null : type,
              paletteInitialQuery: undefined,
            };
          }

          case 'action::@bangle.io/slice-ui:RESET_PALETTE': {
            return {
              ...state,
              paletteType: undefined,
              paletteInitialQuery: '',
              paletteMetadata: {},
            };
          }

          case UI_CONTEXT_TOGGLE_COLOR_SCHEME: {
            const schema: ColorScheme =
              state.colorScheme === COLOR_SCHEMA.DARK
                ? COLOR_SCHEMA.LIGHT
                : COLOR_SCHEMA.DARK;
            changeColorScheme(schema);

            return {
              ...state,
              colorScheme: schema,
            };
          }

          case 'action::@bangle.io/slice-ui:UPDATE_COLOR_SCHEME': {
            changeColorScheme(action.value.colorScheme);

            return {
              ...state,
              colorScheme: action.value.colorScheme,
            };
          }

          case 'action::@bangle.io/slice-ui:UPDATE_WINDOW_SIZE': {
            const { windowSize } = action.value;
            const widescreen = checkWidescreen(windowSize.width);
            setRootWidescreenClass(widescreen);

            return {
              ...state,
              widescreen,
            };
          }

          case 'action::@bangle.io/slice-ui:SHOW_DIALOG': {
            return {
              ...state,
              dialogName: action.value.dialogName,
              dialogMetadata: action.value.metadata,
            };
          }

          case 'action::@bangle.io/slice-ui:DISMISS_DIALOG': {
            if (!action.value.dialogName) {
              return {
                ...state,
                dialogName: undefined,
                dialogMetadata: undefined,
              };
            }
            const dialogNames = Array.isArray(action.value.dialogName)
              ? action.value.dialogName
              : [action.value.dialogName];

            if (state.dialogName && dialogNames.includes(state.dialogName)) {
              return {
                ...state,
                dialogName: undefined,
                dialogMetadata: undefined,
              };
            }

            return state;
          }

          case 'action::@bangle.io/slice-ui:UPDATE_NEW_CHANGELOG': {
            return {
              ...state,
              changelogHasUpdates: action.value.hasUpdates,
            };
          }

          case 'action::@bangle.io/slice-ui:UPDATE_NOTE_SIDEBAR': {
            return {
              ...state,
              noteSidebar: action.value.visible,
            };
          }

          case 'action::@bangle.io/slice-ui:TOGGLE_NOTE_SIDEBAR': {
            return {
              ...state,
              noteSidebar: !state.noteSidebar,
            };
          }

          default: {
            let val: never = action;

            return state;
          }
        }
      },

      stateToJSON(value) {
        return {
          dialogName: null,
          dialogMetadata: null,
          paletteInitialQuery: null,
          paletteMetadata: null,
          paletteType: null,

          ...initialUISliceState,
          sidebar: value.sidebar || null,
          colorScheme: value.colorScheme,
          noteSidebar: value.noteSidebar,
        } satisfies Record<keyof Required<UISliceState>, any>;
      },

      stateFromJSON(_, _value: any) {
        let value = _value as Record<keyof Required<UISliceState>, any>;

        const state: UISliceState = {
          ...initialUISliceState,
          sidebar: value.sidebar,
          colorScheme: value.colorScheme || getThemePreference(),
          noteSidebar: value.noteSidebar,
          widescreen: checkWidescreen(),
        };

        return state;
      },
    },
    sideEffect() {
      return {
        deferredOnce(store, abortSignal) {
          const state = uiSliceKey.getSliceState(store.state);

          if (state) {
            changeColorScheme(state.colorScheme);
            setRootWidescreenClass(state.widescreen);
          }

          listenToResize((obj) => {
            store.dispatch({
              name: 'action::@bangle.io/slice-ui:UPDATE_WINDOW_SIZE',
              value: {
                windowSize: obj,
              },
            });
          }, abortSignal);
        },
      };
    },
  });
}
