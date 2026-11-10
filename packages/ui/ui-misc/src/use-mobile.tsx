import { WIDESCREEN_WIDTH } from '@bangle.io/constants';
import * as React from 'react';

function getIsMobile() {
  return typeof window !== 'undefined' && window.innerWidth < WIDESCREEN_WIDTH;
}

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(getIsMobile);

  React.useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia(`(max-width: ${WIDESCREEN_WIDTH - 1}px)`);
    const onChange = () => {
      setIsMobile(getIsMobile());
    };
    mql.addEventListener('change', onChange);
    setIsMobile(getIsMobile());
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return isMobile;
}
