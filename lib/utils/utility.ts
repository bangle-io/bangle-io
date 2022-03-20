import _debounceFn from 'debounce-fn';
import { keyName } from 'w3c-keyname';

import { EditorView } from '@bangle.dev/pm';
import { Emitter } from '@bangle.dev/utils';

import { isMac, SPLIT_SCREEN_MIN_WIDTH } from '@bangle.io/config';

export { serialExecuteQueue } from '@bangle.dev/utils';
export { isAbortError } from '@bangle.io/is-abort-error';

export { Emitter };

export function getLast<T>(array: T[]): T | undefined {
  return array[array.length - 1];
}

export const checkWidescreen = (
  width = typeof window !== 'undefined' ? window.innerWidth : undefined,
) => (width ? SPLIT_SCREEN_MIN_WIDTH <= width : false);

// typeof navigator != 'undefined' ? /Mac/.test(navigator.platform) : false;
// :: (Object) → (view: EditorView, event: dom.Event) → bool
// Given a set of bindings (using the same format as
// [`keymap`](#keymap.keymap), return a [keydown
// handler](#view.EditorProps.handleKeyDown) that handles them.

export function keybindingsHelper(bindings: {
  [key: string]: (view: EditorView, event: Event) => boolean;
}) {
  let map = normalize(bindings);

  function normalize(map: {
    [key: string]: (view: EditorView, event: Event) => boolean;
  }) {
    let copy = Object.create(null);
    for (let prop in map) {
      copy[normalizeKeyName(prop)] = map[prop];
    }

    return copy;
  }

  function modifiers(name: string, event: KeyboardEvent, shift: boolean) {
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

  function normalizeKeyName(name: string): string {
    let parts = name.split(/-(?!$)/),
      result = parts[parts.length - 1]!;
    if (result === 'Space') {
      result = ' ';
    }
    let alt, ctrl, shift, meta;
    for (let i = 0; i < parts.length - 1; i++) {
      let mod = parts[i];

      if (typeof mod === 'string' && /^(cmd|meta|m)$/i.test(mod)) {
        meta = true;
      } else if (typeof mod === 'string' && /^a(lt)?$/i.test(mod)) {
        alt = true;
      } else if (typeof mod === 'string' && /^(c|ctrl|control)$/i.test(mod)) {
        ctrl = true;
      } else if (typeof mod === 'string' && /^s(hift)?$/i.test(mod)) {
        shift = true;
      } else if (typeof mod === 'string' && /^mod$/i.test(mod)) {
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

  return function (event: KeyboardEvent) {
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

export function cx(...args: any[]) {
  const classes: string[] = [];
  for (const arg of args) {
    if (!arg) {
      continue;
    }
    classes.push(arg);
  }

  return classes.join(' ');
}

export function sleep(t = 20): Promise<void> {
  return new Promise((res) => setTimeout(res, t));
}

/**
 * @param {Function} fn - A unary function whose paramater is non-primitive,
 *                        so that it can be cached using WeakMap
 */
export function weakCache<T extends (arg: any) => any>(fn: T): T {
  const cache = new WeakMap();
  const res = (arg: any) => {
    let value = cache.get(arg);
    if (value) {
      return value;
    }
    value = fn(arg);
    cache.set(arg, value);

    return value;
  };

  return res as T;
}

export function dedupeArray<T>(array: T[]) {
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

let dayJs: typeof import('dayjs') | undefined;
export async function getDayJs({} = {}): Promise<typeof import('dayjs')> {
  if (dayJs) {
    return dayJs;
  }
  let [_dayjs, _localizedFormat]: [any, any] = (await Promise.all([
    import('dayjs'),
    import('dayjs/plugin/localizedFormat'),
  ])) as [any, any];

  dayJs = _dayjs.default || _dayjs;
  _localizedFormat = _localizedFormat.default || _localizedFormat;
  dayJs?.extend(_localizedFormat);
  if (!dayJs) {
    throw new Error('dayJs cannot be undefined');
  }

  return dayJs;
}

export function conditionalPrefix(str: string, part: string) {
  if (str.startsWith(part)) {
    return str;
  }

  return part + str;
}

export function conditionalSuffix(str: string, part: string) {
  if (str.endsWith(part)) {
    return str;
  }

  return str + part;
}

export function removeMdExtension(str: string) {
  if (str.endsWith('.md')) {
    return str.slice(0, -3);
  }

  return str;
}

// Shallow compares array in an out of order fashion.
// For example [1,2] and [2,1] will be equal.
export function shallowCompareArray(array1: any[], array2: any[]) {
  if (array1.length !== array2.length) {
    return false;
  }

  const array2Set = new Set(array2);

  return array1.every((item) => array2Set.has(item));
}

export function shallowOrderedArrayCompare<T>(
  array1: T[],
  array2: T[],
): boolean {
  if (array1.length !== array2.length) {
    return false;
  }

  return array1.every((item, index) => {
    return item === array2[index];
  });
}

export function randomStr(len = 10) {
  return Math.random().toString(36).substring(2, 15).slice(0, len);
}

export const debounceFn = _debounceFn;

export function insertAt<T>(arr: T[], index: number, newItem: T): T[] {
  return [
    // part of the array before the specified index
    ...arr.slice(0, index),
    // inserted items
    newItem,
    // part of the array after the specified index
    ...arr.slice(index),
  ];
}

// Finds the nearest ancestor which is scrollable
export function findWrappingScrollable(node: Element): Element | undefined {
  for (let cur = node.parentNode; cur; cur = cur.parentNode) {
    if (cur instanceof Element) {
      if (cur.scrollHeight > cur.clientHeight) {
        return cur;
      }
    }
  }

  return undefined;
}

export function keyDisplayValue(key: string): string {
  if (key.includes('Mod')) {
    key = key.split('Mod').join(isMac ? '⌘' : 'Ctrl');
  }

  key = key
    .split('-')
    .map((r) => {
      if (/^[A-Z]$/.test(r)) {
        return `Shift-${r.toLocaleLowerCase()}`;
      }

      return r;
    })
    .join('-');

  if (key.includes('Shift')) {
    key = key.split('Shift').join('⇧');
  }

  return key;
}

export function generateUid(len = 10) {
  return Math.random().toString(36).substring(2, 15).slice(0, len);
}

// Throws an abort error if a signal is already aborted.
export function assertSignal(signal: AbortSignal) {
  if (signal.aborted) {
    throw new DOMException('AbortError', 'AbortError');
  }
}

// Throws an abort error if a signal is already aborted.
export function asssertNotUndefined(
  value: unknown,
  message: string,
): asserts value {
  if (value === undefined) {
    throw new Error(`assertion failed: ${message}`);
  }
}

export function cloneMap<K, V>(map: Map<K, V>) {
  return new Map(map.entries());
}

export function createEmptyArray(size: number) {
  return Array.from({ length: size }, () => {
    return undefined;
  });
}

const hasOwnProperty = Object.prototype.hasOwnProperty;

/**
 * From react https://github.com/facebook/fbjs/blob/main/packages/fbjs/src/core/shallowEqual.js#L39-L67
 * Performs equality by iterating through keys on an object and returning false
 * when any key has values which are not strictly equal between the arguments.
 * Returns true when the values of all keys are strictly equal.
 */
export function shallowEqual<T extends {}>(objA: any, objB: any): boolean {
  if (Object.is(objA, objB)) {
    return true;
  }

  if (
    typeof objA !== 'object' ||
    objA === null ||
    typeof objB !== 'object' ||
    objB === null
  ) {
    return false;
  }

  const keysA: any = Object.keys(objA);
  const keysB: any = Object.keys(objB);

  if (keysA.length !== keysB.length) {
    return false;
  }

  // Test for A's keys different from B.
  for (let i = 0; i < keysA.length; i++) {
    if (
      !hasOwnProperty.call(objB, keysA[i]!) ||
      !Object.is(objA[keysA[i]!], objB[keysA[i]!])
    ) {
      return false;
    }
  }

  return true;
}

export function makeSafeForCSS(name: string) {
  return name.replace(/[^a-z0-9]/g, function (s: string) {
    let c = s.charCodeAt(0);
    if (c === 32) {
      return '-';
    }
    if (c >= 65 && c <= 90) {
      return '_' + s.toLowerCase();
    }

    return '__';
  });
}

export function shuffleArray<T>(a: T[]): T[] {
  let array: any[] = a.slice(0);
  for (let i = array.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1)); // random index from 0 to i
    // swap elements array[i] and array[j]
    [array[i], array[j]] = [array[j], array[i]];
  }

  return array;
}
