import React from 'react';
import { CommandPalette } from './CommandPalette/CommandPalette';
import { FilePalette } from './FilePalette/FilePalette';
import { UIActions, UIContext } from 'bangle-play/app/store/UIContext';
import { Palette } from '../ui/Palette';
import { WorkspacePalette } from './Palettes/WorkspacePalette';
import { keybindingsHelper } from '../misc/keybinding-helper';

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

  // return { paletteType, subQuery: query };

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
  static contextType = UIContext;

  state = {
    subQuery: '',
    counter: 0,
    execute: false,
  };

  onDismiss = () => {
    if (this.context.paletteType) {
      this.context.updateUIContext(UIActions.closePalette());
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
    const { paletteType, subQuery } = parseRawQuery(
      rawQuery,
      this.context.paletteType,
    );

    if (paletteType !== this.context.paletteType) {
      this.context.updateUIContext(UIActions.openPalette(paletteType));
    }

    this.setState({
      subQuery,
    });
  };

  componentDidMount() {
    const keyBindings = {
      toggleCommandPalette: {
        key: 'Mod-P',
        onExecute: ({ updateUIContext }) => {
          updateUIContext(UIActions.openCommandPalette());
          return true;
        },
      },

      openPalette: {
        key: 'Mod-p',
        onExecute: ({ updateUIContext }) => {
          if (this.context.paletteType === 'file') {
            this.setState({
              counter: this.state.counter + 1,
            });
            return true;
          }
          updateUIContext(UIActions.openPalette('file'));
          return true;
        },
      },

      openWorkspacePalette: {
        key: 'Ctrl-r',
        onExecute: ({ updateUIContext }) => {
          if (this.context.paletteType === 'workspace') {
            this.setState({
              counter: this.state.counter + 1,
            });
            return true;
          }
          updateUIContext(UIActions.openPalette('workspace'));
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
                updateUIContext: this.context.updateUIContext,
                // updateWorkspaceContext: this.context.updateWorkspaceContext,
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

    if (!this.context.paletteType) {
      return null;
    }

    const type = this.context.paletteType;
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
        query={generateRawQuery(this.context.paletteType, this.state.subQuery)}
        counter={counter}
      >
        {child}
      </Palette>
    );
  }
}
