import React from 'react';
import PropTypes from 'prop-types';

export class SideBar extends React.PureComponent {
  static propTypes = {
    toggleTheme: PropTypes.func.isRequired,
    openNew: PropTypes.func.isRequired,
    downloadBackup: PropTypes.func.isRequired,
  };

  render() {
    return (
      <div
        className={`grid-side-bar flex flex-col z-20 shadow-2xl overflow-auto `}
      >
        <div className="bg-stronger-color top-0 text-2xl pb-1 pl-3">Files</div>
        <div
          className="text-xl cursor-pointer my-1 py-2 px-3 hover:bg-gray-300 rounded-lg"
          onClick={async () => {
            this.props.toggleTheme();
          }}
        >
          Theme Toggle
        </div>
        <div
          className="text-xl cursor-pointer my-1 py-2 px-3 hover:bg-gray-300 rounded-lg"
          onClick={async () => {
            this.props.downloadBackup();
          }}
        >
          Dump data
        </div>
        {this.props.children}
        <div
          className="text-xl cursor-pointer my-1 py-2 px-3 hover:bg-gray-300 rounded-lg"
          onClick={async () => {
            this.props.openNew();
          }}
        >
          New
        </div>
      </div>
    );
  }
}
