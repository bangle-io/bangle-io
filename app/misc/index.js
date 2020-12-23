const LOG = false;
let log = LOG ? console.log.bind(console, 'play/misc') : () => {};

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
