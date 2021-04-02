import React, { useContext } from 'react';
import { UIManagerContext } from '../../UIManager';

import { FolderIcon, TerminalIcon } from '../../helper-ui/Icons';

ActivityBar.propTypes = {};
export function ActivityBar() {
  const { sidebar, paletteType, dispatch, widescreen } = useContext(
    UIManagerContext,
  );

  const toggleSidebar = () => {
    dispatch({
      type: 'UI/TOGGLE_SIDEBAR',
      value: { type: 'file-browser' },
    });
  };

  const togglePalette = () => {
    dispatch({
      type: 'UI/TOGGLE_PALETTE',
    });
  };

  return (
    <div className={`activity-bar ${widescreen ? 'widescreen' : ''}`}>
      <div>
        <ActivityBarBox
          isActive={sidebar}
          widescreen={widescreen}
          onClick={toggleSidebar}
        >
          <FolderIcon className="h-5 w-5 text-gray-100 cursor-pointer" />
        </ActivityBarBox>
        <ActivityBarBox
          widescreen={widescreen}
          isActive={!!paletteType}
          onClick={togglePalette}
        >
          <TerminalIcon className="h-5 w-5 text-gray-100 cursor-pointer" />
        </ActivityBarBox>
      </div>
    </div>
  );
}

function ActivityBarBox({ widescreen, children, isActive, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-center
          focus:outline-none 
          pt-3 pb-3 ${widescreen ? 'border-l-2' : ''} mt-1 mb-1`}
      style={{
        borderColor: !isActive ? 'transparent' : 'var(--accent-2-color)',
      }}
    >
      <span>{children}</span>
    </button>
  );
}
