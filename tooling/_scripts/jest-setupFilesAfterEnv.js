let original = structuredClone;
// structuredClone is used by `fake-indexeddb` to clone various objects
// We override this function to allow for perserving `File` instance when
// saving in `fake-indexeddb`.
globalThis.structuredClone = newStructuredClone;

function newStructuredClone(obj, transferables) {
  let hasFile = false;
  deepMap(obj, (val) => {
    if (val instanceof File) {
      hasFile = true;
    }

    return val;
  });

  if (hasFile) {
    return { ...obj };
  }

  return original(obj, transferables);
}

globalThis.Blob = require('buffer').Blob;
globalThis.crypto = require('crypto').webcrypto;

globalThis.File = class File {
  constructor(parts, filename, properties) {
    this.parts = parts;
    this.filename = filename;
    this.properties = properties;

    if (typeof this.parts[0] === 'string') {
      this.parts[0] = new Blob(this.parts, this.properties);
    }
  }

  async arrayBuffer() {
    return this.parts[0].arrayBuffer();
  }

  async text() {
    if (typeof this.parts[0] === 'string') {
      return this.parts[0];
    }

    return this.parts[0].text();
  }
};

require('cross-fetch/polyfill');
require('@bangle.io/fake-idb/auto-mock');

const { fakeIdb, clearFakeIdb } = require('@bangle.io/test-utils/fake-idb');
const idbHelpers = require('@bangle.io/test-utils/indexedb-ws-helpers');

jest.mock('idb-keyval', () => {
  const { fakeIdb } = jest.requireActual('@bangle.io/test-utils/fake-idb');

  return { ...fakeIdb };
});

globalThis.beforeEach(() => {
  idbHelpers.beforeEachHook();
});

globalThis.afterEach(async () => {
  idbHelpers.afterEachHook();
  clearFakeIdb();
});

globalThis.fakeIdb = fakeIdb;

function deepMap(obj, mapFn) {
  let object = mapFn(obj);

  if (Array.isArray(object)) {
    return object.map((item) => deepMap(item, mapFn));
  }

  if (isPlainObject(object)) {
    return Object.fromEntries(
      Object.entries(object).map(([key, value]) => {
        return [key, deepMap(value, mapFn)];
      }),
    );
  }

  return object;
}

function isPlainObject(value) {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);

  return (
    (prototype === null ||
      prototype === Object.prototype ||
      Object.getPrototypeOf(prototype) === null) &&
    !(Symbol.toStringTag in value) &&
    !(Symbol.iterator in value)
  );
}
