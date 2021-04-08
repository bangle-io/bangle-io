import { createRef, useCallback, useEffect, useState, useRef } from 'react';
import { keybindingsHelper, rafSchedule } from './utility';

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

export function useWatchClickOutside(onClickOutside, onClickInside) {
  const ref = createRef();
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

  return ref;
}

/**
 * Catches unhandled sync and async error
 */
export function useCatchError(callback) {
  useEffect(() => {
    const errorHandler = async (errorEvent) => {
      let error = errorEvent.error;
      if (errorEvent.promise) {
        try {
          await errorEvent.promise;
        } catch (promiseError) {
          error = promiseError;
        }
      }

      if (!error) {
        return;
      }

      callback(error);
    };

    window.addEventListener('error', errorHandler);
    window.addEventListener('unhandledrejection', errorHandler);
    return () => {
      window.removeEventListener('error', errorHandler);
      window.removeEventListener('unhandledrejection', errorHandler);
    };
  }, [callback]);
}

/**
 *
 * @param {String} key the key with which it will stored in localStorage
 * @param {Object|Function} initialValue Signature useStates's initial value and does
 *          lazy initialization. If an item exists in the localstorage it will be used
 *          else fallback to the initialValue.
 */
export function useLocalStorage(key, initialValue) {
  // State to store our value
  // Pass initial state function to useState so logic is only executed once
  const [storedValue, setStoredValue] = useState(() => {
    return getItemFromLocalStorage(key, initialValue);
  });

  const initialValueRef = useRef(initialValue);

  // update ref so that when key changes we can use
  // latest initialValue
  useEffect(() => {
    initialValueRef.current = initialValue;
  }, [initialValue]);

  // restore hook to the new keys state
  useEffect(() => {
    setStoredValue(getItemFromLocalStorage(key, initialValueRef.current));
  }, [key]);

  const setValue = useCallback(
    (value) => {
      setStoredValue((storedValue) => {
        const valueToStore =
          value instanceof Function ? value(storedValue) : value;
        try {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        } catch (error) {
          console.log(error);
        }
        return valueToStore;
      });
    },
    [key],
  );

  return [storedValue, setValue];
}

function getItemFromLocalStorage(key, _defaultValue) {
  const defaultValue =
    _defaultValue instanceof Function ? _defaultValue() : _defaultValue;

  try {
    // Get from local storage by key
    const item = window.localStorage.getItem(key);
    // Parse stored json or if none return initialValue
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    // If error also return initialValue
    console.log(error);
    return defaultValue;
  }
}
