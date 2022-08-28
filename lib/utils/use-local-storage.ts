import { useCallback, useEffect, useRef, useState } from 'react';

// each key is prefixed with this so that its easy to find
// entries created by this
export const KEY_PREFIX = 'useLocalStorage/1/';
/**
 *
 * @param {String} key the key with which it will stored in localStorage
 * @param {Object|Function} initialValue  useStates's initial value. If an item exists
 *        in the localstorage it will be used else fallback to the initialValue and will
 *        also be set in localstorage.
 */
export function useLocalStorage<S>(
  key: string,
  initialValue: S | (() => S),
): [S, React.Dispatch<React.SetStateAction<S>>] {
  key = KEY_PREFIX + key;
  // TODO i think over time we might populate this with a ton of shit.
  // we should have a mechanism to kill some of values, for example having timestamp.
  // and then listing all keys and deleting anything which is old.

  // State to store our value
  // Pass initial state function to useState so logic is only executed once
  const [hookValue, updateHookState] = useState<S>(() => {
    return retrieveValue(key, initialValue);
  });

  const initialValueRef = useRef(initialValue);

  // update ref so that when key changes we can use
  // latest initialValue
  useEffect(() => {
    initialValueRef.current = initialValue;
  }, [initialValue]);

  // update the state if key changes
  useEffect(() => {
    const existingValue = retrieveValue(key, initialValueRef.current);
    updateHookState(existingValue);
  }, [key]);

  const setValue: React.Dispatch<React.SetStateAction<S>> = useCallback(
    (value) => {
      updateHookState((storedValue) => {
        const valueToStore =
          value instanceof Function ? value(storedValue) : value;
        try {
          localStorageSetItem(key, valueToStore);
        } catch (error) {
          console.log(error);
        }

        return valueToStore;
      });
    },
    [key],
  );

  return [hookValue, setValue];
}

function retrieveValue<T>(key: string, _defaultValue: T | (() => T)): T {
  const getDefValue = () =>
    _defaultValue instanceof Function ? _defaultValue() : _defaultValue;

  try {
    // Get from local storage by key
    const item = localStorageGetItem<T>(key);

    if (item == null) {
      const defValue = getDefValue();
      // if item does not exist save it in local storage
      localStorageSetItem(key, defValue);

      return defValue;
    }

    return item;
  } catch (error) {
    // If error also return initialValue
    console.log(error);
    localStorageDeleteItem(key);

    return getDefValue();
  }
}

function localStorageSetItem<T>(key: string, value: T) {
  window.localStorage.setItem(
    key,
    JSON.stringify({ payload: value, time: Date.now() }),
  );
}

function localStorageDeleteItem(key: string) {
  window.localStorage.removeItem(key);
}

function localStorageGetItem<T>(key: string): T | undefined {
  const value = window.localStorage.getItem(key);

  if (value == null) {
    return undefined;
  }

  const parsedValue = JSON.parse(value);

  if (parsedValue == null) {
    return undefined;
  }

  return parsedValue['payload'] as T;
}
