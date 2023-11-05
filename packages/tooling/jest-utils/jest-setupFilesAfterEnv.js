require('cross-fetch/polyfill');
require('fake-indexeddb/auto');

const { IDBFactory } = require('fake-indexeddb');

globalThis.indexedDB = new IDBFactory();

beforeEach(() => {
  // clear idb before every test
  globalThis.indexedDB = new IDBFactory();
});

let original = structuredClone;
// // structuredClone is used by `fake-indexeddb` to clone various objects
// // We override this function to allow for perserving `File` instance when
// // saving in `fake-indexeddb`.
globalThis.structuredClone = newStructuredClone;

globalThis.FileSystemHandle = class FileSystemHandle {
  kind = null;
  name = null;
  isSameEntry(other) {
    return this.name === other.name && this.kind === other.kind;
  }
};

function newStructuredClone(obj, transferables) {
  if (obj instanceof File) {
    return new File([obj.parts[0]], obj.filename, obj.properties);
  }

  let hasFile = false;
  deepMap(obj, (val) => {
    if (val instanceof File) {
      hasFile = true;

      return new File([val.parts[0]], val.filename, val.properties);
    }

    return val;
  });

  if (hasFile) {
    return { ...obj };
  }

  return original(obj, transferables);
}

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
