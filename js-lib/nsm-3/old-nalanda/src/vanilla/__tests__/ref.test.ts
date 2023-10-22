import { slice } from '../slice';
import { Store } from '../store';
import { ref } from '../ref';
import { effect } from '../effect';
import { DerivativeStore } from '../base-store';
import waitForExpect from 'wait-for-expect';
import { testCleanup } from '../helpers/test-cleanup';

const sliceA = slice([], {
  name: 'sliceA',
  state: {
    sliceAField1: 'value:sliceAField1',
    sliceAField2: 'value:sliceAField2',
  },
});

const sliceB = slice([], {
  name: 'sliceB',
  state: { sliceBField1: 'value:sliceBField1' },
});

// to get around the abstract class limitation
class MyDerivedStore extends DerivativeStore<any> {}

beforeEach(() => {
  testCleanup();
});

test('ref works', async () => {
  const myStore = Store.create({
    storeName: 'myStore',
    slices: [sliceA, sliceB],
  });

  const getMyRef = ref<{ foo: { counter?: number } }>(() => ({
    foo: {},
  }));

  myStore.effect((store) => {
    const val = sliceA.track(store);

    const myRef = getMyRef(store);

    myRef.current.foo.counter = 1;
  });

  const derStore = new MyDerivedStore(myStore, 'testStore');

  expect(getMyRef(derStore).current).toEqual({
    foo: {},
  });

  // effect is deferred so we need to wait for it to run
  await waitForExpect(() => {
    expect(getMyRef(derStore).current.foo.counter).toBe(1);
  });
});

test('creating another store does not reuse the ref value', async () => {
  const myStore = Store.create({
    storeName: 'myStore',
    slices: [sliceA, sliceB],
  });

  const myStore2 = Store.create({
    storeName: 'myStore2',
    slices: [sliceA, sliceB],
  });

  const getMyRef = ref<{ foo: { counter?: number } }>(() => ({
    foo: {},
  }));

  myStore.effect((store) => {
    const val = sliceA.track(store);

    const myRef = getMyRef(store);

    myRef.current.foo.counter = 1;
  });

  myStore2.effect((store) => {
    const myRef = getMyRef(store);

    myRef.current.foo.counter = 99;
  });

  const derStore = new MyDerivedStore(myStore, 'testStore');
  const derStore2 = new MyDerivedStore(myStore2, 'testStore2');

  expect(getMyRef(derStore).current).toEqual({
    foo: {},
  });

  // effect is deferred so we need to wait for it to run
  await waitForExpect(() => {
    expect(getMyRef(derStore).current.foo.counter).toBe(1);
  });

  // effect is deferred so we need to wait for it to run
  await waitForExpect(() => {
    expect(getMyRef(derStore2).current.foo.counter).toBe(99);
  });
});

test('multiple effects can share the ref value', async () => {
  const myStore = Store.create({
    storeName: 'myStore',
    slices: [sliceA, sliceB],
  });

  const getMyRef = ref<{ foo: { counter?: number } }>(() => ({
    foo: {},
  }));

  myStore.effect((store) => {
    const val = sliceA.track(store).sliceAField1;

    const myRef = getMyRef(store);

    myRef.current.foo.counter = 1;
  });

  myStore.effect((store) => {
    const val = sliceB.track(store).sliceBField1;

    const myRef = getMyRef(store);

    if (myRef.current.foo.counter === 1) {
      myRef.current.foo.counter = 2;
    }
  });

  const derStore = new MyDerivedStore(myStore, 'testStore');

  expect(getMyRef(derStore).current).toEqual({
    foo: {},
  });

  await waitForExpect(() => {
    expect(getMyRef(derStore).current.foo.counter).toBe(2);
  });
});
