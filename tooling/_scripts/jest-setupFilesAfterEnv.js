const { fakeIdb, clearFakeIdb } = require('@bangle.io/test-utils/fake-idb');

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
