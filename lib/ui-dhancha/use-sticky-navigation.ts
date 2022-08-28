import type { MutableRefObject } from 'react';
import { useEffect } from 'react';

export function useStickyNavigation(
  widescreen: boolean,
  activitybarRef: MutableRefObject<HTMLDivElement | null>,
) {
  useEffect(() => {
    let callback: undefined | (() => void);

    if (!widescreen && activitybarRef.current) {
      callback = setupStickyNavigation(activitybarRef.current);
    }

    return () => {
      callback?.();
    };
  }, [widescreen, activitybarRef]);
}

function setupStickyNavigation(element: HTMLElement) {
  const removeUp = () => {
    element.classList.add('B-ui-dhancha_down');
    element.classList.remove('B-ui-dhancha_up');
  };

  const addUp = () => {
    element.classList.add('B-ui-dhancha_up');
    element.classList.remove('B-ui-dhancha_down');
  };

  const updateNav = () => {
    // iOS scrolls to make sure the viewport fits, don't hide the input then
    const hasKeyboardFocus =
      document.activeElement &&
      (document.activeElement.nodeName === 'INPUT' ||
        document.activeElement.nodeName === 'TEXTAREA');

    if (hasKeyboardFocus) {
      return;
    }

    const isNotAtTop = window.pageYOffset > 10;

    if (isNotAtTop) {
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
