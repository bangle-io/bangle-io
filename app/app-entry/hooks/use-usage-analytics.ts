import { useEffect } from 'react';

import { useLocalStorage } from '@bangle.io/utils';

const LoadDate = Date.now();
const OneDayMilliseconds = 24 * 60 * 60 * 1000;

export function useUsageAnalytics() {
  const [lastOpened, updateLastOpened] = useLocalStorage<number | undefined>(
    'entry-lao-2',
    LoadDate,
  );

  const [dauCount, updateDauCount] = useLocalStorage<number>('entry-dau-2', 0);

  useEffect(() => {
    if (dauCount === 3) {
      (window as any).fathom?.trackGoal('9MRJUARY', 0);
    }
    if (dauCount === 5) {
      (window as any).fathom?.trackGoal('EWFOWT8V', 0);
    }
  }, [dauCount, updateDauCount]);

  useEffect(() => {
    if (lastOpened && LoadDate - lastOpened > OneDayMilliseconds) {
      updateLastOpened(LoadDate);
      updateDauCount((dauCount) => dauCount + 1);

      (window as any).fathom?.trackGoal('EC54OGMM', 0);
    }
  }, [lastOpened, updateDauCount, updateLastOpened]);
}
