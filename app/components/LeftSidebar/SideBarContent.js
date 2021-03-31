import React from 'react';

export class SideBarContent extends React.PureComponent {
  static propTypes = {};

  render() {
    return (
      <div
        className={`fadeInLeftAnimation sidebar-content flex flex-col shadow-2xl overflow-auto `}
      >
        <div className=" top-0 text-2xl pb-1 pl-3">Files</div>
        {this.props.children}
      </div>
    );
  }
}
