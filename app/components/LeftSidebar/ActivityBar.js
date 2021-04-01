import React, { useContext } from 'react';
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
    <div className="activity-bar">
      <div>
        <ActivityBarBox isActive={sidebar} onClick={toggleSidebar}>
          <FolderIcon className="h-5 w-5 text-gray-100 cursor-pointer" />
        </ActivityBarBox>
        <ActivityBarBox isActive={!!paletteType} onClick={togglePalette}>
          <TerminalIcon className="h-5 w-5 text-gray-100 cursor-pointer" />
        </ActivityBarBox>
      </div>
    </div>
  );
}

function ActivityBarBox({ children, isActive, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-center
          focus:outline-none 
          pt-3 pb-3 border-l-2 mt-1 mb-1`}
      style={{
        borderColor: !isActive ? 'transparent' : 'var(--accent-2-color)',
      }}
    >
      <span>{children}</span>
    </button>
  );
}
