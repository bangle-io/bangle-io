import { DuoWeakMap } from '../duo-weak-map';

test('works 1', () => {
  const duoMap = new DuoWeakMap<any, any, any>();

  const key1 = {};
  const key2 = {};
  const val = {};
  duoMap.set([key1, key2], val);

  expect(duoMap.get([key1, key2])).toBe(val);
  expect(duoMap.has([key1, key2])).toBe(true);

  expect(duoMap.get([key2, key1])).toBe(undefined);
  expect(duoMap.get([{}, key2])).toBe(undefined);
  expect(duoMap.get([key1, {}])).toBe(undefined);
  expect(duoMap.has([key2, key1])).toBe(false);
});

test('works 2', () => {
  const duoMap = new DuoWeakMap<any, any, any>();

  const key1 = {};
  const key2 = {};
  const key3 = {};
  const val1 = {};
  const val2 = {};
  duoMap.set([key1, key2], val1);
  duoMap.set([key1, key3], val2);

  expect(duoMap.get([key1, key2])).toBe(val1);
  expect(duoMap.get([key1, key3])).toBe(val2);

  expect(duoMap.get([key2, key1])).toBe(undefined);
  expect(duoMap.get([key1, key1])).toBe(undefined);
});
