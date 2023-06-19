import type { Options } from 'debounce-fn';
import debounceFn from 'debounce-fn';
import type { DependencyList } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { keybindingsHelper } from './utility';

export * from './use-local-storage';
export * from './use-recency-monitor';

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
export function useKeybindings<T extends (...args: any[]) => any>(
  cb: T,
  deps: DependencyList,
) {
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

export function useWatchClickOutside(
  ref: React.RefObject<HTMLElement>,
  onClickOutside?: () => void,
  onClickInside?: () => void,
) {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!ref.current) {
        return;
      }

      let inside =
        typeof e.composedPath === 'function'
          ? e.composedPath().includes(ref.current)
          : ref.current.contains(e.target as Node);

      if (inside) {
        onClickInside?.();

        return;
      }
      onClickOutside?.();

      return;
    };
    document.addEventListener('click', handler);

    return () => {
      document.removeEventListener('click', handler);
    };
  }, [ref, onClickOutside, onClickInside]);
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
  channelName: string,
): [T | undefined, (data: T) => void] {
  const infiniteRecurseRef = useRef(0);
  const lastSentRef = useRef<number | undefined>();
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

export function usePrevious<T>(value: T | undefined): T | undefined {
  // The ref object is a generic container whose current property is mutable ...
  // ... and can hold any value, similar to an instance property on a class
  const ref = useRef<T | undefined>();
  // Store current value in ref
  useEffect(() => {
    ref.current = value;
  }, [value]); // Only re-run if value changes

  // Return previous value (happens before update in useEffect above)
  return ref.current;
}

export function useInterval<T extends (...args: any[]) => any>(
  callback: T,
  deps: DependencyList,
  interval: number,
) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const memoCb = useCallback(callback, deps);

  useEffect(() => {
    let id = setInterval(memoCb, interval);

    return () => {
      clearInterval(id);
    };
  }, [memoCb, interval]);
}
