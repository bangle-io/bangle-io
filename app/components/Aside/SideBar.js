import React from 'react';

export class SideBar extends React.PureComponent {
  static propTypes = {};

  render() {
    return (
      <div className={`side-bar flex flex-col z-20 shadow-2xl overflow-auto `}>
        <div className=" top-0 text-2xl pb-1 pl-3">Files</div>
        {this.props.children}
      </div>
    );
  }
}
