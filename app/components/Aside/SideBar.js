import React from 'react';

export class SideBar extends React.PureComponent {
  static propTypes = {};

  render() {
    return (
      <div
        className={`grid-side-bar flex flex-col z-20 shadow-2xl overflow-auto `}
      >
        <div className="bg-stronger-color top-0 text-2xl pb-1 pl-3">Files</div>
        {this.props.children}
      </div>
    );
  }
}
