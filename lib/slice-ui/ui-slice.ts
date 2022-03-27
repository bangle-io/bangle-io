import { CorePalette } from '@bangle.io/constants';
import { ApplicationStore, Slice, SliceKey } from '@bangle.io/create-store';
import type { ThemeType } from '@bangle.io/shared-types';
import {
  assertActionName,
  checkWidescreen,
  rafSchedule,
  useWindowSize,
} from '@bangle.io/utils';

import { applyTheme } from './apply-theme';

const LOG = false;
let log = LOG ? console.log.bind(console, 'UISlice') : () => {};

export type UiContextDispatchType = ApplicationStore<
  UISliceState,
  UiContextAction
>['dispatch'];

export interface UISliceState {
  changelogHasUpdates: boolean;
  dialogName?: string | null;
  dialogMetadata?: undefined | { [key: string]: any };
  noteSidebar: boolean;
  paletteInitialQuery?: string | null;
  paletteMetadata?: any | null;
  paletteType?: CorePalette | null;
  sidebar?: string | null;
  theme: ThemeType;
  widescreen: boolean;
}

export const UI_CONTEXT_TOGGLE_THEME =
  'action::@bangle.io/slice-ui:TOGGLE_THEME';

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
  | { name: 'action::@bangle.io/slice-ui:RESET_PALETTE' }
  | { name: typeof UI_CONTEXT_TOGGLE_THEME }
  | {
      name: 'action::@bangle.io/slice-ui:UPDATE_THEME';
      value: { theme: ThemeType };
    }
  | {
      name: 'action::@bangle.io/slice-ui:UPDATE_WINDOW_SIZE';
      value: { windowSize: ReturnType<typeof useWindowSize> };
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
      value: { dialogName: string | string[] };
    }
  | {
      name: 'action::@bangle.io/slice-ui:UPDATE_NEW_CHANGELOG';
      value: { hasUpdates: boolean };
    }
  | {
      name: 'action::@bangle.io/slice-ui:UPDATE_NOTE_SIDEBAR';
      value: { visible: boolean };
    }
  | { name: 'action::@bangle.io/slice-ui:TOGGLE_NOTE_SIDEBAR' };

export const initialState: UISliceState = {
  // UI
  changelogHasUpdates: false,
  dialogName: undefined,
  dialogMetadata: undefined,
  noteSidebar: false,
  paletteInitialQuery: undefined,
  paletteMetadata: undefined,
  paletteType: undefined,
  sidebar: undefined,
  theme: getThemePreference(),
  widescreen: checkWidescreen(),
};

export const uiSliceKey = new SliceKey<UISliceState, UiContextAction>(
  'ui-slice',
);

export function uiSlice(): Slice<UISliceState, UiContextAction> {
  assertActionName('@bangle.io/slice-ui', uiSliceKey);

  return new Slice({
    key: uiSliceKey,
    state: {
      init: () => {
        return Object.assign({}, initialState);
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

          case UI_CONTEXT_TOGGLE_THEME: {
            const theme: ThemeType = state.theme === 'dark' ? 'light' : 'dark';
            applyTheme(theme);

            return {
              ...state,
              theme,
            };
          }

          case 'action::@bangle.io/slice-ui:UPDATE_THEME': {
            applyTheme(action.value.theme);

            return {
              ...state,
              theme: action.value.theme,
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
            return state;
          }
        }
      },

      stateToJSON(value) {
        //
        return {
          ...initialState,
          notifications: [],
          sidebar: value.sidebar,
          theme: value.theme,
          noteSidebar: value.noteSidebar,
        };
      },

      stateFromJSON(_, value: any) {
        const state: UISliceState = Object.assign({}, initialState, {
          sidebar: value.sidebar,
          theme: value.theme || getThemePreference(),
          noteSidebar: value.noteSidebar,
          widescreen: checkWidescreen(),
        });

        return state;
      },
    },
    sideEffect() {
      return {
        deferredOnce(store, abortSignal) {
          const state = uiSliceKey.getSliceState(store.state);

          if (state) {
            applyTheme(state.theme);
            setRootWidescreenClass(state.widescreen);
          }

          // Handler to call on window resize
          const handleResize = rafSchedule(() => {
            store.dispatch({
              name: 'action::@bangle.io/slice-ui:UPDATE_WINDOW_SIZE',
              value: {
                windowSize: {
                  width: window.innerWidth,
                  height: window.innerHeight,
                },
              },
            });
          });

          // Add event listener
          window.addEventListener('resize', handleResize);

          abortSignal.addEventListener('abort', () => {
            handleResize.cancel();
            window.removeEventListener('resize', handleResize);
          });
        },
      };
    },
  });
}

function getThemePreference() {
  if (typeof window === 'undefined') {
    return 'light';
  }

  return window?.matchMedia?.('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function setRootWidescreenClass(widescreen?: boolean) {
  const root = document.getElementById('root');
  const body = document.body;

  if (widescreen) {
    root?.classList.add('bu_widescreen');
    body?.classList.add('bu_widescreen');
  } else {
    root?.classList.remove('bu_widescreen');
    body?.classList.remove('bu_widescreen');
  }
}
