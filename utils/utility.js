import { isMac, SPLIT_SCREEN_MIN_WIDTH } from 'config/index';
import { useCallback, useEffect, useRef, useState } from 'react';
import { keyName } from 'w3c-keyname';

export function getLast(array) {
  return array[array.length - 1];
}

/**
 * Based on idea from https://github.com/alexreardon/raf-schd
 * Throttles the function and calls it with the latest argument
 * @param {Function} fn
 */
export function rafSchedule(fn) {
  let lastArgs = [];
  let frameId = null;

  const wrapperFn = (...args) => {
    // Always capture the latest value
    lastArgs = args;

    // There is already a frame queued
    if (frameId) {
      return;
    }

    // Schedule a new frame
    frameId = requestAnimationFrame(() => {
      frameId = null;
      fn(...lastArgs);
    });
  };

  // Adding cancel property to result function
  wrapperFn.cancel = () => {
    if (!frameId) {
      return;
    }
    cancelAnimationFrame(frameId);
    frameId = null;
  };

  return wrapperFn;
}

export const checkWidescreen = (width = window.innerWidth) =>
  SPLIT_SCREEN_MIN_WIDTH <= width;

// typeof navigator != 'undefined' ? /Mac/.test(navigator.platform) : false;
// :: (Object) → (view: EditorView, event: dom.Event) → bool
// Given a set of bindings (using the same format as
// [`keymap`](#keymap.keymap), return a [keydown
// handler](#view.EditorProps.handleKeyDown) that handles them.

export function keybindingsHelper(bindings) {
  let map = normalize(bindings);

  function normalize(map) {
    let copy = Object.create(null);
    for (let prop in map) {
      copy[normalizeKeyName(prop)] = map[prop];
    }
    return copy;
  }

  function modifiers(name, event, shift) {
    if (event.altKey) {
      name = 'Alt-' + name;
    }
    if (event.ctrlKey) {
      name = 'Ctrl-' + name;
    }
    if (event.metaKey) {
      name = 'Meta-' + name;
    }
    if (shift !== false && event.shiftKey) {
      name = 'Shift-' + name;
    }
    return name;
  }

  function normalizeKeyName(name) {
    let parts = name.split(/-(?!$)/),
      result = parts[parts.length - 1];
    if (result === 'Space') {
      result = ' ';
    }
    let alt, ctrl, shift, meta;
    for (let i = 0; i < parts.length - 1; i++) {
      let mod = parts[i];
      if (/^(cmd|meta|m)$/i.test(mod)) {
        meta = true;
      } else if (/^a(lt)?$/i.test(mod)) {
        alt = true;
      } else if (/^(c|ctrl|control)$/i.test(mod)) {
        ctrl = true;
      } else if (/^s(hift)?$/i.test(mod)) {
        shift = true;
      } else if (/^mod$/i.test(mod)) {
        if (isMac) {
          meta = true;
        } else {
          ctrl = true;
        }
      } else {
        throw new Error('Unrecognized modifier name: ' + mod);
      }
    }
    if (alt) {
      result = 'Alt-' + result;
    }
    if (ctrl) {
      result = 'Ctrl-' + result;
    }
    if (meta) {
      result = 'Meta-' + result;
    }
    if (shift) {
      result = 'Shift-' + result;
    }
    return result;
  }
  return function (event) {
    let name = keyName(event),
      isChar = name.length === 1 && name !== ' ';
    const direct = map[modifiers(name, event, !isChar)];
    // if the handler returns true prevent default it
    if (direct && direct()) {
      event.preventDefault();
      return;
    }
  };
}

export function cx(...args) {
  const classes = [];
  for (const arg of args) {
    if (!arg) {
      continue;
    }
    classes.push(arg);
  }
  return classes.join(' ');
}

export function sleep(t = 20) {
  return new Promise((res) => setTimeout(res, t));
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
// TODO write tests for this
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

  // Return a wrapped version of useState's setter function that ...
  // ... persists the new value to localStorage.
  const setValue = useCallback(
    (value) => {
      try {
        // Allow value to be a function so we have same API as useState
        const valueToStore =
          value instanceof Function ? value(storedValue) : value;
        // Save state
        setStoredValue(valueToStore);
        // Save to local storage
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      } catch (error) {
        // A more advanced implementation would handle the error case
        console.log(error);
      }
    },
    [key, storedValue],
  );

  return [storedValue, setValue];
}
