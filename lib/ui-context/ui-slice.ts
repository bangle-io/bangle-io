import { CorePalette } from '@bangle.io/constants';
import { ApplicationStore, Slice, SliceKey } from '@bangle.io/create-store';
import type {
  NotificationPayloadType,
  ThemeType,
} from '@bangle.io/shared-types';
import { checkWidescreen, rafSchedule, useWindowSize } from '@bangle.io/utils';

import { applyTheme } from './apply-theme';

const LOG = false;
let log = LOG ? console.log.bind(console, 'UISlice') : () => {};

export type UiContextDispatchType = ApplicationStore<
  UISliceState,
  UiContextAction
>['dispatch'];

export interface UISliceState {
  changelogHasUpdates: boolean;
  modal?: string | null;
  modalValue?: undefined | { [key: string]: any };
  noteSidebar: boolean;
  notifications: NotificationPayloadType[];
  paletteInitialQuery?: string | null;
  paletteMetadata?: any | null;
  paletteType?: CorePalette | null;
  sidebar?: string | null;
  theme: ThemeType;
  widescreen: boolean;
}

export const UI_CONTEXT_TOGGLE_THEME = 'action::ui-context/TOGGLE_THEME';

export type UiContextAction =
  | { name: 'UI/TOGGLE_SIDEBAR'; value: { type: string } }
  | { name: 'UI/CHANGE_SIDEBAR'; value: { type: string | null } }
  | { name: 'UI/SHOW_NOTIFICATION'; value: NotificationPayloadType }
  | { name: 'UI/DISMISS_NOTIFICATION'; value: { uid: string } }
  | {
      name: 'UI/UPDATE_PALETTE';
      value: {
        type: CorePalette | null;
        initialQuery?: string;
      };
    }
  | { name: 'UI/RESET_PALETTE' }
  | { name: typeof UI_CONTEXT_TOGGLE_THEME }
  | { name: 'UI/UPDATE_THEME'; value: { theme: ThemeType } }
  | {
      name: 'UI/UPDATE_WINDOW_SIZE';
      value: { windowSize: ReturnType<typeof useWindowSize> };
    }
  | {
      name: 'UI/SHOW_MODAL';
      value: {
        modal: string | null;
        modalValue?: undefined | { [key: string]: any };
      };
    }
  | {
      name: 'UI/DISMISS_MODAL';
    }
  | { name: 'UI/UPDATE_NEW_CHANGELOG'; value: { hasUpdates: boolean } }
  | { name: 'UI/UPDATE_NOTE_SIDEBAR'; value: { visible: boolean } }
  | { name: 'UI/TOGGLE_NOTE_SIDEBAR' };

export const initialState: UISliceState = {
  // UI
  changelogHasUpdates: false,
  modal: undefined,
  modalValue: undefined,
  noteSidebar: false,
  notifications: [],
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
  return new Slice({
    key: uiSliceKey,
    state: {
      init: () => {
        return Object.assign({}, initialState);
      },
      apply: (action, state) => {
        log({ action, state });
        switch (action.name) {
          case 'UI/TOGGLE_SIDEBAR': {
            const sidebar = Boolean(state.sidebar)
              ? undefined
              : action.value.type;
            return {
              ...state,
              sidebar,
            };
          }

          case 'UI/CHANGE_SIDEBAR': {
            return {
              ...state,
              sidebar: action.value.type,
            };
          }

          case 'UI/SHOW_NOTIFICATION': {
            const { uid } = action.value;

            // Prevent repeat firing of notifications
            if (state.notifications.find((n) => n.uid === uid)) {
              return state;
            }

            return {
              ...state,
              notifications: [...state.notifications, action.value],
            };
          }

          case 'UI/DISMISS_NOTIFICATION': {
            const { uid } = action.value;
            if (state.notifications.some((n) => n.uid === uid)) {
              return {
                ...state,
                notifications: state.notifications.filter((n) => n.uid !== uid),
              };
            }

            return state;
          }

          case 'UI/UPDATE_PALETTE': {
            return {
              ...state,
              paletteType: action.value.type,
              paletteInitialQuery: action.value.initialQuery,
            };
          }

          case 'UI/RESET_PALETTE': {
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

          case 'UI/UPDATE_THEME': {
            applyTheme(action.value.theme);
            return {
              ...state,
              theme: action.value.theme,
            };
          }

          case 'UI/UPDATE_WINDOW_SIZE': {
            const { windowSize } = action.value;
            const widescreen = checkWidescreen(windowSize.width);
            setRootWidescreenClass(widescreen);
            return {
              ...state,
              widescreen,
            };
          }

          case 'UI/SHOW_MODAL': {
            return {
              ...state,
              modal: action.value.modal,
              modalValue: action.value.modalValue,
            };
          }

          case 'UI/DISMISS_MODAL': {
            return {
              ...state,
              modal: undefined,
              modalValue: undefined,
            };
          }

          case 'UI/UPDATE_NEW_CHANGELOG': {
            return {
              ...state,
              changelogHasUpdates: action.value.hasUpdates,
            };
          }

          case 'UI/UPDATE_NOTE_SIDEBAR': {
            return {
              ...state,
              noteSidebar: action.value.visible,
            };
          }

          case 'UI/TOGGLE_NOTE_SIDEBAR': {
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
    sideEffect(store) {
      const state = uiSliceKey.getSliceState(store.state);

      if (state) {
        applyTheme(state.theme);
        setRootWidescreenClass(state.widescreen);
      }

      // Handler to call on window resize
      const handleResize = rafSchedule(() => {
        store.dispatch({
          name: 'UI/UPDATE_WINDOW_SIZE',
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

      return {
        destroy() {
          handleResize.cancel();
          window.removeEventListener('resize', handleResize);
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

function setRootWidescreenClass(widescreen) {
  const root = document.getElementById('root');
  const body = document.body;
  if (widescreen) {
    root?.classList.add('widescreen');
    body?.classList.add('widescreen');
  } else {
    root?.classList.remove('widescreen');
    body?.classList.remove('widescreen');
  }
}
