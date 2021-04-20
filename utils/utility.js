import { isMac, SPLIT_SCREEN_MIN_WIDTH } from 'config/index';
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

/**
 * @param {Function} fn - A unary function whose paramater is non-primitive,
 *                        so that it can be cached using WeakMap
 */
export function weakCache(fn) {
  const cache = new WeakMap();
  return (arg) => {
    let value = cache.get(arg);
    if (value) {
      return value;
    }
    value = fn(arg);
    cache.set(arg, value);
    return value;
  };
}

export function dedupeArray(array) {
  return [...new Set(array)];
}

/** Based on https://developer.mozilla.org/docs/Web/HTTP/Browser_detection_using_the_user_agent */
export function isTouchDevice() {
  var hasTouchScreen = false;
  if ('maxTouchPoints' in navigator) {
    hasTouchScreen = navigator.maxTouchPoints > 0;
  } else if ('msMaxTouchPoints' in navigator) {
    // @ts-ignore
    hasTouchScreen = navigator.msMaxTouchPoints > 0;
  } else {
    var mQ =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      matchMedia('(pointer:coarse)');
    if (mQ && mQ.media === '(pointer:coarse)') {
      hasTouchScreen = !!mQ.matches;
    } else if ('orientation' in window) {
      hasTouchScreen = true; // deprecated, but good fallback
    } else {
      // Only as a last resort, fall back to user agent sniffing
      // @ts-ignore
      var UA = navigator.userAgent;
      hasTouchScreen =
        /\b(BlackBerry|webOS|iPhone|IEMobile)\b/i.test(UA) ||
        /\b(Android|Windows Phone|iPad|iPod)\b/i.test(UA);
    }
  }
  return hasTouchScreen;
}

export function serialExecuteQueue() {
  let prev = Promise.resolve();
  return {
    add: (cb) => {
      return new Promise((resolve, reject) => {
        prev = prev.then(() => {
          return Promise.resolve(cb()).then(
            (resultCb) => {
              resolve(resultCb);
            },
            (err) => {
              reject(err);
            },
          );
        });
      });
    },
  };
}
