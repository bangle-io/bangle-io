import './OptionsBar.css';
import React, { useCallback, useContext } from 'react';
import { SecondaryEditorIcon } from '../helper-ui/Icons';
import { useWorkspacePath } from 'workspace/index';
import { UIManagerContext } from 'ui-context/index';
import { cx, useKeybindings } from 'utils/index';

export function OptionsBar() {
  const { widescreen, dispatch } = useContext(UIManagerContext);
  let {
    wsPath,
    secondaryWsPath,
    pushWsPath,
    removeSecondaryWsPath,
  } = useWorkspacePath();

  const toggleSidebar = useCallback(() => {
    if (!wsPath) {
      return;
    }
    if (secondaryWsPath) {
      removeSecondaryWsPath();
    } else {
      pushWsPath(wsPath, false, true);
    }
  }, [secondaryWsPath, wsPath, removeSecondaryWsPath, pushWsPath]);

  useKeybindings(() => {
    return {
      'Mod-\\': () => {
        if (widescreen) {
          toggleSidebar();
          return true;
        }
        return false;
      },
    };
  }, [widescreen, toggleSidebar]);

  return (
    <div className="options-bar-area">
      <div className="options-bar-content">
        {widescreen && (
          <button
            type="button"
            className={cx(secondaryWsPath && 'active', 'focus:outline-none')}
            onClick={(event) => {
              toggleSidebar();
            }}
          >
            <SecondaryEditorIcon
              className="cursor-pointer"
              style={{
                height: 24,
                width: 24,
                color: secondaryWsPath
                  ? 'var(--accent-stronger-color)'
                  : 'currentColor',
              }}
            />
          </button>
        )}
      </div>
    </div>
  );
}
