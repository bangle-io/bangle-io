import { slice } from '../slice';
import { testCleanup } from '../helpers/test-cleanup';
import { Store } from '../store';
import waitForExpect from 'wait-for-expect';
import { cleanup } from '../cleanup';
import { ref } from '../ref';
import { DerivativeStore } from '../base-store';
import { operation } from '../operation';
import { InferSliceNameFromSlice } from '../types';

beforeEach(() => {
  testCleanup();
});

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

const setup = () => {
  const updateSliceAField1 = sliceA.action((sliceAField1: string) => {
    let transaction = sliceA.tx((state) => {
      return sliceA.update(state, { sliceAField1 });
    });

    return transaction;
  });

  const updateSliceAField2 = sliceA.action((sliceAField2: string) => {
    let transaction = sliceA.tx((state) => {
      return sliceA.update(state, { sliceAField2 });
    });

    return transaction;
  });

  const updateSliceBField1 = sliceB.action((sliceBField1: string) => {
    return sliceB.tx((state) => {
      return sliceB.update(state, { sliceBField1 });
    });
  });

  const store = Store.create({
    storeName: 'test',
    slices: [sliceA, sliceB],
  });

  return {
    store,
    sliceA,
    sliceB,
    updateSliceAField1,
    updateSliceAField2,
    updateSliceBField1,
  };
};

it('creates and executes an operation', async () => {
  const { store, updateSliceAField1 } = setup();

  const called = jest.fn();
  const cleanupCalled = jest.fn();
  const operationTest = store.operation((operationValue: string) => {
    return (store) => {
      store.dispatch(updateSliceAField1(operationValue));
      called();

      cleanup(store, () => {
        cleanupCalled(operationValue);
      });
    };
  });

  store.dispatch(operationTest('val1'));

  await waitForExpect(() => {
    expect(called).toHaveBeenCalledTimes(1);
  });

  // cleanup should only be called when op is called again
  expect(cleanupCalled).toHaveBeenCalledTimes(0);

  store.dispatch(operationTest('val2'));

  await waitForExpect(() => {
    expect(cleanupCalled).toHaveBeenCalledTimes(1);
  });
});

// test('type check operation before dispatching', async () => {
//   // should work when both slices are included
//   () => {
//     const opBuilder = operation<
//       | InferSliceNameFromSlice<typeof sliceB>
//       | InferSliceNameFromSlice<typeof sliceA>
//     >();

//     const testOperation = opBuilder((val: string) => {
//       return (store) => {};
//     });

//     let myStore = {} as Store<
//       | InferSliceNameFromSlice<typeof sliceB>
//       | InferSliceNameFromSlice<typeof sliceA>
//       | 'some-slice'
//     >;
//     myStore.dispatch(testOperation('val1'));
//   };

//   // both slices are different
//   () => {
//     const opBuilder = operation<'wrong-slice'>();

//     const testOperation = opBuilder((val: string) => {
//       return (store) => {};
//     });

//     let myStore = {} as Store<'some-slice'>;

//     // @ts-expect-error should not work
//     myStore.dispatch(testOperation('val1'));
//   };

//   //  two slices that are different
//   () => {
//     const opBuilder = operation<'wrong-slice' | 'slice-a'>();

//     const testOperation = opBuilder((val: string) => {
//       return (store) => {};
//     });

//     let myStore = {} as Store<'some-slice'>;
//     // @ts-expect-error should not work
//     myStore.dispatch(testOperation('val1'));
//   };

//   //  two slices that are different
//   () => {
//     const opBuilder = operation<'wrong-slice' | 'slice-a'>();

//     const testOperation = opBuilder((val: string) => {
//       return (store) => {};
//     });

//     let myStore = {} as Store<'some-slice' | 'some-slice-b'>;
//     // @ts-expect-error should not work
//     myStore.dispatch(testOperation('val1'));
//   };

//   //  two slices that are different
//   () => {
//     const opBuilder = operation<'slice-b' | 'slice-a'>();

//     const testOperation = opBuilder((val: string) => {
//       return (store) => {};
//     });

//     let myStore = {} as Store<'slice-f' | 'slice-b' | 'slice-c' | 'slice-a'>;
//     myStore.dispatch(testOperation('val1'));
//   };

//   () => {
//     const opBuilder = operation<
//       'slice-a' | 'slice-b' | 'slice-c' | 'slice-d'
//     >();

//     const testOperation = opBuilder((val: string) => {
//       return (store) => {};
//     });

//     let myStore = {} as Store<'slice-a' | 'slice-b'>;
//     // @ts-expect-error should not work
//     myStore.dispatch(testOperation('val1'), { debugInfo: true });
//   };

//   () => {
//     const opBuilder = operation<'slice-a' | 'slice-b'>();

//     const testOperation = opBuilder((val: string) => {
//       return (store) => {};
//     });

//     let myStore = {} as Store<'slice-a' | 'slice-b' | 'slice-c' | 'slice-d'>;
//     myStore.dispatch(testOperation('val1'));
//   };

//   () => {
//     const opBuilder = operation<'slice-a' | 'slice-e'>();

//     const testOperation = opBuilder((val: string) => {
//       return (store) => {};
//     });

//     let myStore = {} as Store<'slice-a' | 'slice-b' | 'slice-c' | 'slice-d'>;
//     // @ts-expect-error should not work
//     myStore.dispatch(testOperation('val1'));
//   };
// });

test('calling same operation multiple times', async () => {
  const { store, updateSliceAField1 } = setup();

  const called = jest.fn();
  const cleanupCalled = jest.fn();

  const getRef = ref(() => 0);

  let lastRefValue = 0;
  const operationTest = store.operation((operationValue: string) => {
    return (store) => {
      store.dispatch(updateSliceAField1(operationValue));
      called();

      const myRef = getRef(store);

      myRef.current++;

      lastRefValue = myRef.current;
      cleanup(store, () => {
        cleanupCalled(operationValue);
      });
    };
  });

  store.dispatch(operationTest('update-value'));

  await waitForExpect(() => {
    expect(called).toHaveBeenCalledTimes(1);
  });

  let counter = 0;
  for (let i of Array.from({ length: 5 })) {
    store.dispatch(operationTest('test' + counter++));
  }

  await waitForExpect(() => {
    expect(called).toHaveBeenCalledTimes(6);
  });

  expect(sliceA.get(store.state)).toEqual({
    sliceAField1: 'test4',
    sliceAField2: 'value:sliceAField2',
  });

  expect(cleanupCalled).toHaveBeenCalledTimes(5);
  expect(cleanupCalled).nthCalledWith(1, 'update-value');
  expect(cleanupCalled).nthCalledWith(2, 'test0');
  expect(cleanupCalled).nthCalledWith(3, 'test1');
  expect(cleanupCalled).nthCalledWith(4, 'test2');
  expect(cleanupCalled).nthCalledWith(5, 'test3');
  expect(lastRefValue).toEqual(6);
});

it('creates and executes multiple operations', async () => {
  const {
    store,
    sliceA,
    sliceB,
    updateSliceAField1,
    updateSliceAField2,
    updateSliceBField1,
  } = setup();
  const operationValue1 = 'newTestValue1';
  const operationValue2 = 'newTestValue2';
  const operationValue3 = 'newTestValue3';

  const called = jest.fn();
  const getRef = ref(() => 'base');

  const operationTest1 = store.operation((operationValue: string) => {
    return (store) => {
      const myRef = getRef(store);

      myRef.current += ':' + operationValue;
      store.dispatch(updateSliceAField1(operationValue));
      called();
    };
  });

  const operationTest2 = store.operation((operationValue: string) => {
    return (store) => {
      const myRef = getRef(store);

      myRef.current += ':' + operationValue;
      store.dispatch(updateSliceAField2(operationValue));
      called();
    };
  });

  const operationTest3 = store.operation((operationValue: string) => {
    return (store) => {
      const myRef = getRef(store);

      myRef.current += ':' + operationValue;
      store.dispatch(updateSliceBField1(operationValue));
      called();
    };
  });

  store.dispatch(operationTest1(operationValue1));
  store.dispatch(operationTest2(operationValue2));
  store.dispatch(operationTest3(operationValue3));

  await waitForExpect(() => {
    expect(called).toHaveBeenCalledTimes(3);
  });

  expect(sliceA.get(store.state)).toEqual({
    sliceAField1: 'newTestValue1',
    sliceAField2: 'newTestValue2',
  });
  expect(sliceB.get(store.state)).toEqual({
    sliceBField1: 'newTestValue3',
  });

  // to get around the abstract class limitation
  class MyDerivedStore extends DerivativeStore<any> {}

  const derStore = new MyDerivedStore(store, 'testStore');
  expect(getRef(derStore).current).toEqual(
    'base:newTestValue1:newTestValue2:newTestValue3',
  );
});
