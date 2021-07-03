import './ActivityBar.css';

import React, { useContext, useEffect } from 'react';
import { UIManagerContext } from 'ui-context/index';

import {
  ButtonIcon,
  FileDocumentIcon,
  HomeIcon,
  MenuIcon,
} from 'ui-components/index';
import { cx } from 'utils/index';
import { resolvePath } from 'ws-path';
import { useHistory } from 'react-router-dom';
import { useWorkspaceContext } from 'workspace-context/index';
import { ExtensionRegistryContext } from 'extension-registry';
import { ActionContext } from 'action-context/index';

ActivityBar.propTypes = {};

export function ActivityBar() {
  const extensionRegistry = useContext(ExtensionRegistryContext);
  const { dispatchAction } = useContext(ActionContext);

  const { paletteType, sidebar, dispatch, widescreen } =
    useContext(UIManagerContext);
  const { primaryWsPath } = useWorkspaceContext();
  const history = useHistory();

  const toggleSidebar = (type) => (event) => {
    event.preventDefault();
    if (event?.currentTarget) {
      event.currentTarget.blur();
    }
    if (type === sidebar) {
      dispatch({
        type: 'UI/TOGGLE_SIDEBAR',
        value: { type },
      });
    } else {
      dispatch({
        type: 'UI/CHANGE_SIDEBAR',
        value: { type: type },
      });
    }

    dispatch({
      type: 'UI/UPDATE_PALETTE',
      value: {
        type: null,
      },
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
        wsPath={primaryWsPath}
        sidebar={sidebar}
        toggleSidebar={toggleSidebar('file-browser')}
        toggleNotesPalette={() => {
          dispatchAction({
            name: '@action/core-palettes/TOGGLE_NOTES_PALETTE',
          });
        }}
        paletteType={paletteType}
      />
    );
  }

  const topInjectedSidebars = extensionRegistry
    .getSidebars()
    .filter((r) => r.iconPlacement !== 'bottom')
    .map((r) => {
      const isActive = sidebar === r.name;
      return (
        <ActivityBarButton
          key={r.name}
          sidebar={r}
          isActive={isActive}
          toggleSidebar={toggleSidebar}
        />
      );
    });

  const bottomInjectedSidebars = extensionRegistry
    .getSidebars()
    .filter((r) => r.iconPlacement === 'bottom')
    .map((r) => {
      const isActive = sidebar === r.name;
      return (
        <ActivityBarButton
          key={r.name}
          sidebar={r}
          isActive={isActive}
          toggleSidebar={toggleSidebar}
        />
      );
    });

  return (
    <div id="activity-bar-area" className="widescreen flex">
      <div className="flex flex-col flex-grow">
        <ButtonIcon
          onClick={() => {
            dispatch({
              type: 'UI/CHANGE_SIDEBAR',
              value: { type: null },
            });
            history.push('/');
          }}
          hint={sidebar ? null : 'bangle.io'}
          hintPos="right"
          className={cx('flex justify-center pt-3 pb-3 mt-1 mb-1')}
          style={{}}
        >
          <HomeIcon className="h-7 w-7 text-gray-100" />
        </ButtonIcon>
        {topInjectedSidebars}
        <div className="flex-grow"></div>
        {bottomInjectedSidebars}
      </div>
    </div>
  );
}

function ActivityBarSmallscreen({
  sidebar,
  toggleSidebar,
  toggleNotesPalette,
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
          onClick={toggleNotesPalette}
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

function ActivityBarButton({ sidebar, isActive, widescreen, toggleSidebar }) {
  return (
    <ButtonIcon
      key={sidebar.name}
      onClick={toggleSidebar(sidebar.name)}
      hint={isActive ? null : sidebar.hint}
      hintPos="right"
      active={isActive}
      className={cx(
        'flex justify-center pt-3 pb-3 mt-1 mb-1 transition-colors duration-200',
        widescreen && 'border-l-2',
        isActive && 'active',
      )}
      style={{
        borderColor: isActive ? 'var(--accent-stronger-color)' : 'transparent',
      }}
    >
      <span className="h-7 w-7 text-gray-100">{sidebar.icon}</span>
    </ButtonIcon>
  );
}
