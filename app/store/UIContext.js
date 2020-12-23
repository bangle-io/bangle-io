import React from 'react';
import { applyTheme } from '../style/apply-theme';
import { keybindingsHelper } from '../misc/keybinding-helper';
import { WorkspaceContext } from '../workspace/WorkspaceContext';

const LOG = false;

let log = LOG ? console.log.bind(console, 'play/ui-context') : () => {};

const DEFAULT_PALETTE = 'file';

export const UIContext = React.createContext();

const UIKeyBindings = {
  toggleSidebar: {
    key: 'Mod-e',
    onExecute: ({ updateUIContext }) => {
      updateUIContext(UIActions.toggleSidebar());
      return true;
    },
  },
};

export const UIActions = {
  toggleSidebar: () => async (value) => {
    return {
      type: 'TOGGLE_SIDEBAR',
    };
  },

  toggleTheme: () => async (value) => {
    return {
      type: 'TOGGLE_THEME',
    };
  },

  openPalette: (paletteType = DEFAULT_PALETTE) => async (value) => {
    return {
      type: 'OPEN_PALETTE',
      payload: {
        paletteType,
      },
    };
  },

  closePalette: () => async (value) => {
    return {
      type: 'CLOSE_PALETTE',
      payload: {
        paletteType: null,
      },
    };
  },

  openCommandPalette: () => async (value) => {
    return {
      type: 'OPEN_PALETTE',
      payload: {
        paletteType: 'command',
      },
    };
  },
};

const reducers = (value, { type, payload }) => {
  let newValue = value;
  if (type === 'TOGGLE_SIDEBAR') {
    newValue = {
      ...value,
      isSidebarOpen: !value.isSidebarOpen,
    };
  } else if (type === 'TOGGLE_THEME') {
    newValue = {
      ...value,
      theme: value.theme === 'dark' ? 'light' : 'dark',
    };
    localStorage.setItem('theme', newValue.theme);
    applyTheme(newValue.theme);
  } else if (type === 'OPEN_PALETTE') {
    newValue = {
      ...value,
      paletteType: payload.paletteType,
    };
  } else if (type === 'CLOSE_PALETTE') {
    newValue = {
      ...value,
      paletteType: null,
    };
  } else {
    throw new Error('Unknown type ' + type);
  }
  log(newValue);
  return newValue;
};

export class UIContextProvider extends React.PureComponent {
  static contextType = WorkspaceContext;

  get value() {
    return this.state.value;
  }

  updateUIContext = async (action) => {
    const resolvedResult = await action(this.value);

    this.setState((state) => ({
      value: reducers(state.value, resolvedResult),
    }));
  };

  initialValue = {
    isSidebarOpen: false,
    theme: localStorage.getItem('theme') || 'light',
    paletteType: null,
  };

  constructor(props) {
    super(props);
    this.state = {
      value: this.initialValue,
    };
    applyTheme(this.value.theme);

    const callback = keybindingsHelper(
      Object.fromEntries([
        ...Object.entries(UIKeyBindings).map(([key, value]) => {
          return [
            value.key,
            () => {
              return value.onExecute({
                uiContext: this.value,
                updateUIContext: this.updateUIContext,
                updateWorkspaceContext: this.context.updateWorkspaceContext,
              });
            },
          ];
        }),
      ]),
    );
    document.addEventListener('keydown', callback);
    this.removeKeybindingHelper = () => {
      document.removeEventListener('keydown', callback);
    };
  }

  componentWillUnmount() {
    this.removeKeybindingHelper();
  }

  _injectHelpers(value) {
    value.updateUIContext = this.updateUIContext;
    value.updateWorkspaceContext = this.context.updateWorkspaceContext;
    return value;
  }

  render() {
    return (
      <UIContext.Provider value={this._injectHelpers(this.value)}>
        {this.props.children}
      </UIContext.Provider>
    );
  }
}
