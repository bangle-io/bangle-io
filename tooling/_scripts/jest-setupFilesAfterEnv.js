require('cross-fetch/polyfill');
const { fakeIdb, clearFakeIdb } = require('@bangle.io/test-utils/fake-idb');
const { webcrypto } = require('crypto');
const { Blob } = require('buffer');

const idbHelpers = require('@bangle.io/test-utils/indexedb-ws-helpers');

jest.mock('idb-keyval', () => {
  const { fakeIdb } = jest.requireActual('@bangle.io/test-utils/fake-idb');
  return fakeIdb;
});

global.beforeEach(() => {
  idbHelpers.beforeEachHook();
});

global.afterEach(async () => {
  idbHelpers.afterEachHook();
  clearFakeIdb();
});

global.fakeIdb = fakeIdb;

// global.fetch = async () => ({ ok: false, status: 404 });

global.crypto = webcrypto;

global.Blob = Blob;
