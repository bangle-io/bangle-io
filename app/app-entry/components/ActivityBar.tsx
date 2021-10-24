import { useActionContext } from 'action-context';
import { useExtensionRegistryContext } from 'extension-registry';
import React, { useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import {
  ButtonIcon,
  FileDocumentIcon,
  GiftIcon,
  MenuIcon,
  SingleCharIcon,
} from 'ui-components';
import { useUIManagerContext } from 'ui-context';
import { cx } from 'utils';
import { useWorkspaceContext } from 'workspace-context';
import { resolvePath } from 'ws-path';
import './ActivityBar.css';

ActivityBar.propTypes = {};

export function ActivityBar() {
  const extensionRegistry = useExtensionRegistryContext();
  const { dispatchAction } = useActionContext();

  const { changelogHasUpdates, paletteType, sidebar, dispatch, widescreen } =
    useUIManagerContext();
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
          widescreen={widescreen}
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
          widescreen={widescreen}
          toggleSidebar={toggleSidebar}
        />
      );
    });

  return (
    <div id="activity-bar-area" className="flex widescreen">
      <div className="flex flex-col flex-grow">
        <CurrentWorkspaceButton
          onClick={() => {
            dispatch({
              type: 'UI/CHANGE_SIDEBAR',
              value: { type: null },
            });
            history.push('/');
          }}
        />
        {topInjectedSidebars}
        <div className="flex-grow"></div>
        <ButtonIcon
          onClick={() => {
            dispatch({
              type: 'UI/SHOW_MODAL',
              value: { modal: '@modal/changelog' },
            });
          }}
          hint={"What's new"}
          hintPos="right"
          className={cx('flex justify-center pt-3 pb-3 mt-1 mb-1')}
          style={{}}
        >
          <GiftIcon
            className="text-gray-100 h-7 w-7"
            showDot={changelogHasUpdates}
          />
        </ButtonIcon>
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
      className="flex flex-row text-gray-100 align-center"
    >
      <div className="flex flex-col justify-center mr-2">
        <ButtonIcon
          onClick={toggleNotesPalette}
          removeFocus={false}
          className={cx(paletteType && 'bg-gray-600 rounded-sm', 'p-2')}
        >
          <FileDocumentIcon className="w-5 h-5" />
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
            <MenuIcon className="w-5 h-5" />
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

  const nav = document.getElementById('activity-bar-area')!;

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

  const opts = {
    capture: true,
    passive: true,
  };

  // Non-blocking nav change
  document.removeEventListener('scroll', updateNav, opts);

  document.addEventListener('scroll', updateNav, opts);

  return () => {
    document.removeEventListener('scroll', updateNav, opts);
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
      <span
        className={cx('h-7 w-7', !isActive ? 'text-gray-300' : 'text-gray-100')}
      >
        {sidebar.icon}
      </span>
    </ButtonIcon>
  );
}

function CurrentWorkspaceButton({ onClick }) {
  const { wsName } = useWorkspaceContext();
  return (
    <ButtonIcon
      onClick={onClick}
      hint="Workspace Home"
      hintPos="right"
      className={cx('flex justify-center pt-3 pb-3 mt-1 mb-1')}
    >
      <SingleCharIcon
        char={wsName?.[0]?.toLocaleUpperCase() || '?'}
        className="w-8 h-8 text-gray-100"
      />
    </ButtonIcon>
  );
}
