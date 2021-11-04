export function setupStickyNavigation(element: HTMLElement) {
  const removeUp = () => {
    element?.classList.add('down');
    element?.classList.remove('up');
  };

  const addUp = () => {
    element?.classList.add('up');
    element?.classList.remove('down');
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
