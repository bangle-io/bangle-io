import { useCallback, useEffect, useRef,useState } from 'react';

/**
 *
 * @param {String} key the key with which it will stored in localStorage
 * @param {Object|Function} initialValue Signature useStates's initial value and does
 *          lazy initialization. If an item exists in the localstorage it will be used
 *          else fallback to the initialValue.
 */
export function useLocalStorage<S>(
  key: string,
  initialValue: S | (() => S),
): [S, React.Dispatch<React.SetStateAction<S>>] {
  // TODO i think over time we might populate this with a ton of shit.
  // we should have a mechanism to kill some of values, for example having timestamp.
  // and then listing all keys and deleting anything which is old.
  // State to store our value
  // Pass initial state function to useState so logic is only executed once
  const [storedValue, setStoredValue] = useState<S>(() => {
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

  const setValue: React.Dispatch<React.SetStateAction<S>> = useCallback(
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

function getItemFromLocalStorage<T>(
  key: string,
  _defaultValue: T | (() => T),
): T {
  const getDefValue = () =>
    _defaultValue instanceof Function ? _defaultValue() : _defaultValue;

  try {
    // Get from local storage by key
    const item = window.localStorage.getItem(key);
    // Parse stored json or if none return initialValue
    return item ? JSON.parse(item) : getDefValue();
  } catch (error) {
    // If error also return initialValue
    console.log(error);
    return getDefValue();
  }
}
