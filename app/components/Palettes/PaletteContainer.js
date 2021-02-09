import React from 'react';
import { CommandPalette } from './CommandPalette';
import { FilePalette } from './FilePalette';
import { Palette } from '../../ui/Palette';
import { WorkspacePalette } from './WorkspacePalette';
import { keybindingsHelper } from '../../misc/keybinding-helper';
import { UIManagerContext } from '../../ui/UIManager';

const parseRawQuery = (query, paletteType) => {
  // Some of the types depend on the current active query
  // for example if query starts with `>`, it becomes a command type
  // and if a user backspaces `>` it defaults to file.
  // but thats not true for all as `command/input/*` is static
  // and can only be dismissed.
  if (query.startsWith('>')) {
    return { paletteType: 'command', subQuery: query.slice(1) };
  }

  if (query.startsWith('ws:')) {
    return { paletteType: 'workspace', subQuery: query.slice(3) };
  }

  // Disallow changing of palette type
  if (paletteType.startsWith('command/input/')) {
    return { paletteType, subQuery: query };
  }

  return { paletteType: 'file', subQuery: query };
};

const generateRawQuery = (paletteType, subQuery) => {
  if (paletteType === 'command') {
    return '>' + subQuery;
  }

  if (paletteType.startsWith('command/input/')) {
    return subQuery;
  }

  if (paletteType === 'workspace') {
    return 'ws:' + subQuery;
  }

  // defaults to file
  return subQuery;
};

export class PaletteContainer extends React.PureComponent {
  static contextType = UIManagerContext;

  state = {
    subQuery: '',
    counter: 0,
    execute: false,
  };

  onDismiss = () => {
    const { paletteType, dispatch } = this.context;
    if (paletteType) {
      dispatch({
        type: 'UI/CLOSE_PALETTE',
      });
      this.setState({
        subQuery: '',
        counter: 0,
        execute: false,
      });
    }
  };

  onPressEnter = () => {
    this.setState({
      execute: true,
    });
  };

  updateCounter = (counter) => {
    this.setState({
      counter,
    });
  };

  updateQuery = (rawQuery) => {
    const { paletteType: initialPaletteType, dispatch } = this.context;
    const { paletteType, subQuery } = parseRawQuery(
      rawQuery,
      initialPaletteType,
    );

    if (paletteType !== initialPaletteType) {
      dispatch({
        type: 'UI/OPEN_PALETTE',
        value: {
          type: paletteType,
        },
      });
    }

    this.setState({
      subQuery,
    });
  };

  componentDidMount() {
    const keyBindings = {
      toggleCommandPalette: {
        key: 'Mod-P',
        onExecute: () => {
          const { dispatch } = this.context;

          dispatch({
            type: 'UI/OPEN_PALETTE',
            value: {
              type: 'command',
            },
          });
          return true;
        },
      },

      openPalette: {
        key: 'Mod-p',
        onExecute: () => {
          const { paletteType, dispatch } = this.context;
          if (paletteType === 'file') {
            this.setState({
              counter: this.state.counter + 1,
            });
            return true;
          }
          dispatch({
            type: 'UI/OPEN_PALETTE',
            value: { type: 'file' },
          });
          return true;
        },
      },

      openWorkspacePalette: {
        key: 'Ctrl-r',
        onExecute: () => {
          const { paletteType, dispatch } = this.context;

          if (paletteType === 'workspace') {
            this.setState({
              counter: this.state.counter + 1,
            });
            return true;
          }
          dispatch({
            type: 'UI/OPEN_PALETTE',
            value: { type: 'workspace' },
          });
          return true;
        },
      },
    };
    const callback = keybindingsHelper(
      Object.fromEntries([
        ...Object.entries(keyBindings).map(([key, value]) => {
          return [
            value.key,
            () => {
              return value.onExecute({
                uiContext: this.value,
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

  render() {
    const { subQuery, counter } = this.state;
    const { paletteType } = this.context;
    if (!paletteType) {
      return null;
    }

    const type = paletteType;
    const props = {
      type,
      counter: counter,
      query: subQuery,
      execute: this.state.execute,
      onDismiss: this.onDismiss,
    };

    let child;

    if (type === 'command' || type.startsWith('command/input/')) {
      child = <CommandPalette {...props} />;
    } else if (type === 'file') {
      child = <FilePalette {...props} />;
    } else if (type === 'workspace') {
      child = <WorkspacePalette {...props} />;
    } else {
      throw new Error('Unknown type');
    }

    return (
      <Palette
        onDismiss={this.onDismiss}
        onPressEnter={this.onPressEnter}
        updateCounter={this.updateCounter}
        updateQuery={this.updateQuery}
        query={generateRawQuery(paletteType, this.state.subQuery)}
        counter={counter}
      >
        {child}
      </Palette>
    );
  }
}
