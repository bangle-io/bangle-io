import React, { useContext, useEffect } from 'react';
import { UIManagerContext } from 'ui-context/index';

import { ButtonIcon, FolderIcon } from 'ui-components/index';
import { keybindings } from 'config/index';
import { cx } from 'utils/index';

ActivityBar.propTypes = {};
export function ActivityBar() {
  const { sidebar, dispatch, widescreen } = useContext(UIManagerContext);

  const toggleSidebar = (event) => {
    event.preventDefault();
    if (event?.currentTarget) {
      event.currentTarget.blur();
    }
    dispatch({
      type: 'UI/TOGGLE_SIDEBAR',
      value: { type: 'file-browser' },
    });
  };

  useEffect(() => {
    setupStickyNavigation(widescreen);
  }, [widescreen]);

  return (
    <div id="activity-bar-area" className={`${widescreen ? 'widescreen' : ''}`}>
      <div
        style={{
          display: 'flex',
          flexDirection: widescreen ? 'column' : 'row',
        }}
      >
        <ActivityBarBox
          isActive={sidebar}
          widescreen={widescreen}
          onClick={toggleSidebar}
        >
          <FolderIcon className="h-5 w-5 text-gray-100 cursor-pointer" />
        </ActivityBarBox>
      </div>
    </div>
  );
}

function ActivityBarBox({ widescreen, children, isActive, onClick }) {
  return (
    <ButtonIcon
      onClick={onClick}
      hint={
        isActive
          ? null
          : 'File Browser\n' + keybindings.toggleFileBrowser.displayValue
      }
      hintPos="right"
      active={Boolean(isActive)}
      className={cx(
        'flex justify-center pt-3 pb-3 mt-1 mb-1',
        widescreen && 'border-l-2',
      )}
      style={{
        borderColor: isActive
          ? 'var(--activity-bar-font-color)'
          : 'transparent',
      }}
    >
      {children}
    </ButtonIcon>
  );
}

export function setupStickyNavigation(widescreen) {
  if (widescreen) {
    return;
  }

  const nav = document.getElementById('activity-bar-area');

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

    const showNav = () => {
      nav.classList.add('down');
      nav.classList.remove('up');
    };

    const hideNav = () => {
      nav.classList.add('up');
      nav.classList.remove('down');
    };

    const goingUp = window.pageYOffset > 1 && window.pageYOffset > previousY;
    previousY = window.pageYOffset;

    if (goingUp) {
      showNav();
    } else {
      hideNav();
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
}
