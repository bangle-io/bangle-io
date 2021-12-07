import { useEffect } from 'react';

import { useLocalStorage } from '@bangle.io/utils';

const LoadDate = Date.now();

export function useUsageAnalytics() {
  const [lastOpened, updateLastOpened] = useLocalStorage<number | undefined>(
    'entry-lao-2',
    LoadDate,
  );

  const [dauCount, updateDauCount] = useLocalStorage<number | undefined>(
    'entry-dau-2',
    0,
  );

  useEffect(() => {
    if (dauCount === 3) {
      (window as any).fathom?.trackGoal('9MRJUARY', 1);
    }
    if (dauCount === 5) {
      (window as any).fathom?.trackGoal('EWFOWT8V', 1);
    }
  }, [dauCount, updateDauCount]);

  useEffect(() => {
    // use local storage bug where it doesnt save
    // info in storage initially
    if (lastOpened === undefined) {
      updateLastOpened(LoadDate);
    }

    if (lastOpened && LoadDate - lastOpened > 60 * 60 * 24 * 1000) {
      updateLastOpened(LoadDate);
      updateDauCount((dauCount = 0) => dauCount + 1);

      (window as any).fathom?.trackGoal('EC54OGMM', 1);
    }
  }, [lastOpened, updateDauCount, updateLastOpened]);
}
