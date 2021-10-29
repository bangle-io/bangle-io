import { objectSync } from '../object-sync';

function sleep(t = 10) {
  return new Promise((res) => setTimeout(res, t));
}
test('syncing works', async () => {
  let objA = { test: undefined };
  let objB = { test: undefined };

  let a = objectSync(objA, {
    emitChange: (p) => {
      return sleep(5).then(() => {
        b.applyForeignChange(p);
      });
    },
  });
  let b = objectSync(objB, {
    emitChange: (p) => {
      return sleep(5).then(() => {
        a.applyForeignChange(p);
      });
    },
  });

  a.appStateValue.test = 123;
  await sleep(20);
  expect(b.appStateValue.test).toBe(123);
  expect(a.counter).toBe(1);
  b.appStateValue.test = 124;
  await sleep(20);

  expect(b.counter).toBe(2);
  expect(a.counter).toBe(2);

  expect(a.appStateValue.test).toBe(124);
});

test('throws error if not primitive type', async () => {
  let objA = {};
  let objB = {};

  let a = objectSync(objA, {
    emitChange: (p) => {
      return sleep(5).then(() => {
        b.applyForeignChange(p);
      });
    },
  });
  let b = objectSync(objB, {
    emitChange: (p) => {
      return sleep(5).then(() => {
        a.applyForeignChange(p);
      });
    },
  });

  expect(() => {
    a.appStateValue.test = {};
  }).toThrowErrorMatchingSnapshot();
});

test('throws error if initial not primitive type', async () => {
  let objA = { b: 12 };
  let objB = {};

  let a = objectSync(objA, {
    emitChange: (p) => {
      return sleep(5).then(() => {
        b.applyForeignChange(p);
      });
    },
  });
  let b = objectSync(objB, {
    emitChange: (p) => {
      return sleep(5).then(() => {
        a.applyForeignChange(p);
      });
    },
  });

  expect(() => {
    a.appStateValue.test = {};
  }).toThrowErrorMatchingSnapshot();
});

test('throws error if unknown key', async () => {
  let objA = { b: 12 };

  let a = objectSync(objA);
  // this should be fine
  a.appStateValue.b = 13;

  expect(() => {
    a.appStateValue.c = 13;
  }).toThrowErrorMatchingSnapshot();
});
