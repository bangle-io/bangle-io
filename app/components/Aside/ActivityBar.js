import React, { useContext } from 'react';
import { config } from 'bangle-io/config';
import { UIManagerContext } from '../../UIManager';

import { FolderIcon, TerminalIcon } from '../../helper-ui/Icons';

ActivityBar.propTypes = {};
export function ActivityBar() {
  const { sidebar, paletteType, dispatch } = useContext(UIManagerContext);

  const toggleSidebar = () =>
    dispatch({
      type: 'UI/TOGGLE_SIDEBAR',
    });

  const togglePalette = () =>
    dispatch({
      type: 'UI/TOGGLE_PALETTE',
    });

  return (
    <div
      className={`grid-activity-bar flex md:py-3   ${
        config.isProduction ? 'bg-pink-900' : 'bg-gray-900'
      } flex-col z-30`}
    >
      <AsideButtonBox isActive={sidebar}>
        <FolderIcon
          onClick={toggleSidebar}
          className="aside-button text-gray-100 cursor-pointer"
        />
      </AsideButtonBox>
      <AsideButtonBox isActive={!!paletteType}>
        <TerminalIcon
          onClick={togglePalette}
          className="aside-button text-gray-100 cursor-pointer"
        />
      </AsideButtonBox>
    </div>
  );
}

function AsideButtonBox({ children, isActive }) {
  return (
    <div
      className={`flex aside-button-box items-center justify-center pt-3 pb-3 border-l-2 mt-1 mb-1 ${
        isActive ? 'active' : ''
      }`}
    >
      {children}
    </div>
  );
}
