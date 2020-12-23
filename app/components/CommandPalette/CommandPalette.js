import React from 'react';
import { UIContext } from 'bangle-play/app/store/UIContext';
import PropTypes from 'prop-types';
import { commands } from './commands';
import { Palette } from 'bangle-play/app/ui/Palette';
import { getIdleCallback } from '@bangle.dev/core/utils/js-utils';
const LOG = false;

let log = LOG ? console.log.bind(console, 'play/command-palette') : () => {};

export class CommandPalette extends React.PureComponent {
  static propTypes = {
    type: PropTypes.string.isRequired,
    counter: PropTypes.number.isRequired,
    query: PropTypes.string.isRequired,
    execute: PropTypes.bool,
    onDismiss: PropTypes.func.isRequired,
  };

  static contextType = UIContext;

  renderInputTypeCommand = () => {
    const { type, query } = this.props;
    const commandId = type.split('command/input/').join('');
    const match = commands.find(([key]) => key === commandId);

    if (!match) {
      console.error(commandId, 'command not found');
      getIdleCallback(() => {
        this.props.onDismiss();
      });
      return null;
    }

    const [key, Command] = match;
    return (
      <Command
        key={key}
        query={query}
        isActive={false}
        execute={this.props.execute}
        onDismiss={this.props.onDismiss}
        updateUIContext={this.context.updateUIContext}
        updateWorkspaceContext={this.context.updateWorkspaceContext}
      />
    );
  };

  render() {
    const { query, counter, type } = this.props;

    if (type.startsWith('command/input/')) {
      return this.renderInputTypeCommand();
    }

    const items = getCommands(query);
    return items.map(([key, Command], i) => {
      const isActive = Palette.getActiveIndex(counter, items.length) === i;
      return (
        <Command
          key={key}
          query={query}
          isActive={isActive}
          execute={isActive && this.props.execute}
          onDismiss={this.props.onDismiss}
          updateUIContext={this.context.updateUIContext}
          updateWorkspaceContext={this.context.updateWorkspaceContext}
        />
      );
    });
  }
}

function getCommands(query = '') {
  return commands.filter(([key, command]) => {
    return command.queryMatch(query);
  });
}
