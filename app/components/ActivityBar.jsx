import './ActivityBar.css';

import React, { useContext, useEffect } from 'react';
import { UIManagerContext } from 'ui-context/index';

import {
  ButtonIcon,
  FileDocumentIcon,
  FolderIcon,
  HomeIcon,
  MenuIcon,
  QuestionIcon,
} from 'ui-components/index';
import { keybindings } from 'config/index';
import { cx } from 'utils/index';
import { resolvePath, useWorkspacePath } from 'workspace/index';
import { FILE_PALETTE } from 'palettes/index';
import { useHistory } from 'react-router-dom';

ActivityBar.propTypes = {};

export function ActivityBar() {
  const { paletteType, sidebar, dispatch, widescreen } = useContext(
    UIManagerContext,
  );
  const { wsPath } = useWorkspacePath();
  const history = useHistory();

  const toggleSidebar = (event) => {
    event.preventDefault();
    if (event?.currentTarget) {
      event.currentTarget.blur();
    }
    dispatch({
      type: 'UI/TOGGLE_SIDEBAR',
      value: { type: 'file-browser' },
    });
    dispatch({
      type: 'UI/CHANGE_PALETTE_TYPE',
      value: {
        type: null,
      },
    });
  };

  const toggleFilePalette = () => {
    dispatch({
      type: 'UI/CHANGE_PALETTE_TYPE',
      value: {
        type: paletteType === FILE_PALETTE ? null : FILE_PALETTE,
      },
    });
    dispatch({
      type: 'UI/CHANGE_SIDEBAR',
      value: { type: null },
    });
  };

  // disable sticky when sidebar is showing
  const disableSticky = !widescreen && sidebar;

  useEffect(() => {
    let callback;
    if (!disableSticky) {
      callback = setupStickyNavigation(widescreen);
    }
    return () => {
      if (callback) {
        callback();
      }
    };
  }, [widescreen, disableSticky]);

  if (!widescreen) {
    return (
      <ActivityBarSmallscreen
        wsPath={wsPath}
        sidebar={sidebar}
        toggleSidebar={toggleSidebar}
        toggleFilePalette={toggleFilePalette}
        paletteType={paletteType}
      />
    );
  }

  return (
    <div id="activity-bar-area" className="widescreen flex">
      <div className="flex flex-col flex-grow">
        <ButtonIcon
          onClick={() => {
            history.push('/');
          }}
          hint={sidebar ? null : 'bangle.io'}
          hintPos="right"
          active={!Boolean(wsPath)}
          className={cx(
            'flex justify-center pt-3 pb-3 mt-1 mb-1',
            widescreen && 'border-l-2',
          )}
          style={{
            borderColor: !Boolean(wsPath)
              ? 'var(--accent-stronger-color)'
              : 'transparent',
          }}
        >
          <HomeIcon className="h-7 w-7 text-gray-100" />
        </ButtonIcon>
        <ButtonIcon
          onClick={toggleSidebar}
          hint={
            sidebar
              ? null
              : 'File Browser\n' + keybindings.toggleFileBrowser.displayValue
          }
          hintPos="right"
          active={Boolean(sidebar)}
          className={cx(
            'flex justify-center pt-3 pb-3 mt-1 mb-1 transition-colors duration-200',
            widescreen && 'border-l-2',
          )}
          style={{
            borderColor: sidebar
              ? 'var(--accent-stronger-color)'
              : 'transparent',
          }}
        >
          <FolderIcon className="h-7 w-7 text-gray-100" />
        </ButtonIcon>
        <div className="flex-grow"></div>
        <ButtonIcon
          onClick={() => {
            history.push('/');
          }}
          hint={sidebar ? null : 'bangle.io'}
          hintPos="right"
          active={!Boolean(wsPath)}
          className={cx(
            'flex justify-center pt-3 pb-3 mt-1 mb-1',
            widescreen && 'border-l-2',
          )}
          style={{
            borderColor: !Boolean(wsPath)
              ? 'var(--accent-stronger-color)'
              : 'transparent',
          }}
        >
          <QuestionIcon className="h-7 w-7 text-gray-100" />
        </ButtonIcon>
      </div>
    </div>
  );
}

function ActivityBarSmallscreen({
  sidebar,
  toggleSidebar,
  toggleFilePalette,
  wsPath,
  paletteType,
}) {
  return (
    <div
      id="activity-bar-area"
      className="flex flex-row align-center text-gray-100"
    >
      <div className="flex flex-col justify-center mr-2">
        <ButtonIcon
          onClick={toggleFilePalette}
          removeFocus={false}
          className={cx(paletteType && 'bg-gray-600 rounded-sm', 'p-2')}
        >
          <FileDocumentIcon className="h-5 w-5" />
        </ButtonIcon>
      </div>
      <div className="flex flex-col justify-center mr-2">
        <span>{wsPath ? resolvePath(wsPath).fileName : 'bangle.io'}</span>
      </div>

      <div className="flex flex-grow" />
      <div className="flex flex-col justify-center mr-2">
        {/* disabling menu for now since the command palette works pretty good */}
        {null && (
          <ButtonIcon
            onClick={toggleSidebar}
            removeFocus={false}
            className={cx(sidebar && 'bg-gray-600 rounded-sm', 'p-2')}
          >
            <MenuIcon className="h-5 w-5" />
          </ButtonIcon>
        )}
      </div>
    </div>
  );
}

export function setupStickyNavigation(widescreen) {
  if (widescreen) {
    return () => {};
  }

  const nav = document.getElementById('activity-bar-area');

  const removeUp = () => {
    nav.classList.add('down');
    nav.classList.remove('up');
  };

  const addUp = () => {
    nav.classList.add('up');
    nav.classList.remove('down');
  };
  let previousY = 9999;

  const updateNav = () => {
    // iOS scrolls to make sure the viewport fits, don't hide the input then
    const hasKeyboardFocus =
      document.activeElement &&
      (document.activeElement.nodeName === 'INPUT' ||
        document.activeElement.nodeName === 'TEXTAREA');

    if (hasKeyboardFocus) {
      return;
    }

    const goingUp = window.pageYOffset > 1 && window.pageYOffset > previousY;
    previousY = window.pageYOffset;

    if (goingUp) {
      removeUp();
    } else {
      addUp();
    }
  };

  // Non-blocking nav change
  document.removeEventListener('scroll', updateNav, {
    capture: true,
    passive: true,
  });

  document.addEventListener('scroll', updateNav, {
    capture: true,
    passive: true,
  });

  return () => {
    document.removeEventListener('scroll', updateNav, {
      capture: true,
      passive: true,
    });
    addUp();
  };
}
