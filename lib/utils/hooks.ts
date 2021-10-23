import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { keybindingsHelper, rafSchedule } from './utility';
import debounceFn from 'debounce-fn';
import type { Options } from 'debounce-fn';

export * from './use-recency-monitor';
export * from './use-local-storage';

export function useWindowSize() {
  const [windowSize, setWindowSize] = useState(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));

  useEffect(() => {
    // Handler to call on window resize
    const handleResize = rafSchedule(() => {
      // Set window width/height to state
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    });

    // Add event listener
    window.addEventListener('resize', handleResize);

    // Remove event listener on cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []); // Empty array ensures that effect is only run on mount

  return windowSize;
}

/**
 * Example usage:
 *
 * useKeybindings(() => {
 *   return {
 *     'Mod-P': () => { return true }, // true if you want to handle the event equivalent to preventDefault
 *     'Ctrl-A': () => {...}
 *   }
 * })
 *
 * @param {Function} cb
 * @param {Array} deps
 */
export function useKeybindings(cb, deps) {
  // Using a callback to get a memoized version of bindings
  // which is only invalidated if deps change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const memoCb = useCallback(cb, deps);
  useEffect(() => {
    const keyHandler = keybindingsHelper(memoCb());
    document.addEventListener('keydown', keyHandler);
    return () => {
      document.removeEventListener('keydown', keyHandler);
    };
  }, [memoCb]);
}

export function useWatchClickOutside(ref, onClickOutside, onClickInside) {
  useEffect(() => {
    const handler = (e) => {
      if (!ref.current) {
        return;
      }
      if (ref.current.contains(e.target)) {
        onClickInside();
        return;
      }
      onClickOutside();
      return;
    };
    document.addEventListener('click', handler);
    return () => {
      document.removeEventListener('click', handler);
    };
  }, [ref, onClickOutside, onClickInside]);
}

/**
 * Catches unhandled sync and async error
 */
export function useCatchRejection(callback) {
  useEffect(() => {
    window.addEventListener('unhandledrejection', callback);
    return () => {
      window.removeEventListener('unhandledrejection', callback);
    };
  }, [callback]);
}

export function useDestroyRef() {
  const destroyed = useRef(false);

  useEffect(() => {
    return () => {
      destroyed.current = true;
    };
  }, []);

  return destroyed;
}

// This means if you send INFINITE_RECURSION_SEND_COUNT within INFINITE_RECURSION_TIME_THRESHOLD
// throw error to prevent infinite recursion
const INFINITE_RECURSION_SEND_COUNT = 12;
const INFINITE_RECURSION_TIME_THRESHOLD = 50;

export function useBroadcastChannel<T>(
  channelName,
): [T | undefined, (data: T) => void] {
  const infiniteRecurseRef = useRef(0);
  const lastSentRef = useRef<Number | undefined>();
  const destroyedRef = useRef(false);
  const [lastMessage, updateEvent] = useState<T | undefined>();
  const [bChannel] = useState(() => {
    if (channelName == null) {
      throw new Error('channelName must be provided');
    }
    if (typeof window !== 'undefined' && window.BroadcastChannel) {
      return new BroadcastChannel(channelName);
    }
    return undefined;
  });

  useEffect(() => {
    if (bChannel) {
      bChannel.onmessage = (messageEvent) => {
        updateEvent(messageEvent.data);
      };
    }
  }, [bChannel]);

  useEffect(() => {
    return () => {
      destroyedRef.current = true;
      bChannel?.close();
    };
  }, [bChannel]);

  const broadcastMessage = useCallback(
    (data: T) => {
      if (!destroyedRef.current) {
        const lastSent = lastSentRef.current;
        if (
          lastSent &&
          Date.now() - (lastSent as number) < INFINITE_RECURSION_TIME_THRESHOLD
        ) {
          infiniteRecurseRef.current++;
        } else {
          infiniteRecurseRef.current = 0;
        }
        if (infiniteRecurseRef.current < INFINITE_RECURSION_SEND_COUNT) {
          bChannel?.postMessage(data);
          lastSentRef.current = Date.now();
        } else {
          throw new Error('Avoiding possible infinite recursion');
        }
      }
    },
    [bChannel],
  );

  return [lastMessage, broadcastMessage];
}

/**
 * Note: changing debounceOpts will not trigger an update to debounce options
 * @param value - a value that changes frequently
 * @param debounceOpts
 * @returns a debounced value
 */
export function useDebouncedValue<T>(value: T, debounceOpts: Options) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  const debounceOptsRef = useRef(debounceOpts);

  const valueRef = useRef(value);
  valueRef.current = value;

  const debouncedFunc = useMemo(() => {
    return debounceFn(() => {
      setDebouncedValue(valueRef.current);
    }, debounceOptsRef.current);
  }, []);

  useEffect(() => {
    debouncedFunc();
  }, [value, debouncedFunc]);

  useEffect(() => {
    return () => {
      debouncedFunc.cancel();
    };
  }, [debouncedFunc]);

  return debouncedValue;
}
