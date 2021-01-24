import React, { useContext } from 'react';
import { StackButton } from '../Button';
import { EditorManagerContext } from 'bangle-io/app/workspace2/EditorManager';
import { config } from 'bangle-io/config';

export function ActivityBar() {
  const {
    editorManagerState: { sidebar, paletteType },
    dispatch,
  } = useContext(EditorManagerContext);

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
      className={`grid-activity-bar flex flex-row ${
        config.isProduction ? 'bg-pink-900' : 'bg-gray-900'
      } py-3 flex flex-col z-30`}
    >
      <div className="flex align-center justify-center">
        <StackButton
          onClick={toggleSidebar}
          isActive={sidebar}
          faType="fas fa-folder"
          stack={true}
        />
      </div>
      <div className="flex align-center justify-center">
        <StackButton
          onClick={togglePalette}
          isActive={!!paletteType}
          faType="fas fa-terminal"
          stack={true}
        />
      </div>
    </div>
  );
}

ActivityBar.propTypes = {};
