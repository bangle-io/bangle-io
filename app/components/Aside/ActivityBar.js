import React from 'react';
import { StackButton } from '../Button';
import PropTypes from 'prop-types';
import { UIActions } from 'bangle-play/app/store/UIContext';

export class ActivityBar extends React.PureComponent {
  static propTypes = {
    isSidebarOpen: PropTypes.bool.isRequired,
    updateUIContext: PropTypes.func.isRequired,
  };

  render() {
    return (
      <div
        className={`grid-activity-bar flex flex-row ${
          this.props.isProduction ? 'bg-pink-900' : 'bg-gray-900'
        } py-3 flex flex-col z-30`}
      >
        <div className="flex align-center justify-center">
          <StackButton
            onClick={() => {
              this.props.updateUIContext(UIActions.toggleSidebar());
            }}
            isActive={this.props.isSidebarOpen}
            faType="fas fa-folder"
            stack={true}
          />
        </div>
        <div className="flex align-center justify-center">
          <StackButton
            onClick={() => {
              this.props.updateUIContext(UIActions.openPalette());
            }}
            isActive={!!this.props.paletteType}
            faType="fas fa-terminal"
            stack={true}
          />
        </div>
      </div>
    );
  }
}
