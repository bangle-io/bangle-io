import { WIDESCREEN_WIDTH } from '@bangle.io/constants';
import * as React from 'react';

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(
    undefined,
  );

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${WIDESCREEN_WIDTH - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < WIDESCREEN_WIDTH);
    };
    mql.addEventListener('change', onChange);
    setIsMobile(window.innerWidth < WIDESCREEN_WIDTH);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return !!isMobile;
}
