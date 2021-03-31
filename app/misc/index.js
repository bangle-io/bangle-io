import { SPLIT_SCREEN_MIN_WIDTH } from '../constants';

const LOG = false;
let log = LOG ? console.log.bind(console, 'play/misc') : () => {};

export function getLast(array) {
  return array[array.length - 1];
}

export function sleep(t = 20) {
  return new Promise((res) => setTimeout(res, t));
}

export function strictCheckObject(obj, assert) {
  const entries = Object.entries(obj);
  const keys = (o) => Object.keys(o);

  if (keys(obj).length !== keys(assert).length) {
    log({
      obj,
      assert,
    });
    throw new Error('Size miss match');
  }
  if (!keys(obj).every((r) => keys(assert).includes(r))) {
    log({
      obj,
      assert,
    });
    throw new Error('missing keys match');
  }
  for (const [key, value] of entries) {
    const type = assert[key];
    if (!type) {
      log(value);
      throw new Error('Unkown key:' + key);
    } else if (type === 'string') {
      if (typeof value !== 'string') {
        log(value);
        throw new Error(`${key} expected ${type} got ${value}`);
      }
    } else if (type === 'number') {
      if (typeof value !== 'number') {
        log(value);
        throw new Error(`${key} expected ${type} got ${value}`);
      }
    } else if (type === 'object') {
      const check = typeof value === 'object' && !Array.isArray(value);
      if (!check) {
        throw new Error(`${key} expected ${type} got ${value}`);
      }
    } else if (type === 'array-of-strings') {
      const check =
        Array.isArray(value) && value.every((v) => typeof v === 'string');
      if (!check) {
        log(value);
        throw new Error(`${key} expected ${type} got ${value}`);
      }
    } else if (type === 'array-of-objects') {
      const check =
        Array.isArray(value) &&
        value.every((v) => typeof v === 'object' && !Array.isArray(v));
      if (!check) {
        log(value);
        throw new Error(`${key} expected ${type} got ${value}`);
      }
    } else {
      throw new Error(`${type} is not implemented`);
    }
  }
}

export function downloadJSON(data, filename) {
  if (!data) {
    throw new Error('No data ');
  }

  if (!filename) {
    throw new Error('Filename needed');
  }

  if (typeof data === 'object') {
    data = JSON.stringify(data, undefined, 2);
  }

  var blob = new Blob([data], { type: 'text/json' }),
    e = document.createEvent('MouseEvents'),
    a = document.createElement('a');

  a.download = filename;
  a.href = window.URL.createObjectURL(blob);
  a.dataset.downloadurl = ['text/json', a.download, a.href].join(':');
  e.initMouseEvent(
    'click',
    true,
    false,
    window,
    0,
    0,
    0,
    0,
    0,
    false,
    false,
    false,
    false,
    0,
    null,
  );
  a.dispatchEvent(e);
}

export function readFile(file) {
  // If the new .text() reader is available, use it.
  if (file.text) {
    return file.text();
  }
  // Otherwise use the traditional file reading technique.
  return _readFileLegacy(file);
}

/**
 * Reads the raw text from a file.
 *
 * @private
 * @param {File} file
 * @return {Promise<string>} A promise that resolves to the parsed string.
 */
function _readFileLegacy(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.addEventListener('loadend', (e) => {
      const text = e.srcElement.result;
      resolve(text);
    });
    reader.readAsText(file);
  });
}

/** Based on https://developer.mozilla.org/docs/Web/HTTP/Browser_detection_using_the_user_agent */
function checkTouchDevice() {
  var hasTouchScreen = false;
  if ('maxTouchPoints' in navigator) {
    hasTouchScreen = navigator.maxTouchPoints > 0;
  } else if ('msMaxTouchPoints' in navigator) {
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
      var UA = navigator.userAgent;
      hasTouchScreen =
        /\b(BlackBerry|webOS|iPhone|IEMobile)\b/i.test(UA) ||
        /\b(Android|Windows Phone|iPad|iPod)\b/i.test(UA);
    }
  }
  return hasTouchScreen;
}

export const isTouchDevice = checkTouchDevice();

export const checkWidescreen = (width = window.innerWidth) =>
  SPLIT_SCREEN_MIN_WIDTH <= width;

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
