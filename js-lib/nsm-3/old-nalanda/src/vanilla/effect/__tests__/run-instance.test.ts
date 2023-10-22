import { Store } from '../../store';
import { Slice, slice } from '../../slice';
import { AnySlice } from '../../types';
import { RunInstance } from '../run-instance';
import { testCleanup } from '../../helpers/test-cleanup';

let sliceA: Slice<
  'slice1',
  {
    foo: string;
  },
  never
>;
let sliceB: Slice<
  'slice2',
  {
    sliceBField: string;
    sliceBOtherField: string;
  },
  never
>;
let store: Store;

beforeEach(() => {
  testCleanup();
  // Initialize your slices here. The actual initialization depends on your implementation
  sliceA = slice([], {
    name: 'slice1',
    state: {
      foo: 'bar',
    },
  });
  sliceB = slice([], {
    name: 'slice2',
    state: {
      sliceBField: 'bar',
      sliceBOtherField: 'bizz',
    },
  });
  store = Store.create({
    storeName: 'test',
    slices: [sliceA, sliceB],
  });
});

describe('RunInstance', () => {
  describe('dependencies.has', () => {
    it('should identify tracked slice correctly', () => {
      let runInstance = new RunInstance(store, 'test');

      runInstance.addTrackedField(sliceA, 'foo', 'bar');

      expect(runInstance.dependencies.has(sliceA)).toBe(true);
      expect(runInstance.dependencies.has(sliceB)).toBe(false);
    });
  });
});

describe('whatDependenciesStateChange', () => {
  it('should return false for a blank instance', () => {
    let runInstance1 = new RunInstance(store, 'test');

    expect(runInstance1.whatDependenciesStateChange()).toBe(false);
  });

  it('should return false when value is the same', () => {
    let runInstance1 = new RunInstance(store, 'test');
    runInstance1.addTrackedField(sliceA, 'foo', 'bar');

    expect(runInstance1.whatDependenciesStateChange()).toBe(false);
    expect(runInstance1.dependencies.has(sliceA)).toBe(true);
  });

  it('should return true if tracked things have changed', () => {
    let runInstance1 = new RunInstance(store, 'test');
    runInstance1.addTrackedField(sliceA, 'foo', 'bar');

    let runInstance2 = runInstance1.newRun();
    expect(runInstance2.dependencies.has(sliceA)).toBe(false);

    runInstance2.addTrackedField(sliceA, 'foo', 'xyz');

    expect(runInstance2.dependencies.has(sliceA)).toBe(true);

    expect(runInstance2.whatDependenciesStateChange()).toBe('foo');
  });

  it('should return true when store state have changed', () => {
    let myAction = sliceA.action((val: string) => {
      return sliceA.tx((state) => {
        return sliceA.update(state, { foo: val });
      });
    });

    let runInstance1 = new RunInstance(store, 'test');
    runInstance1.addTrackedField(sliceA, 'foo', sliceA.get(store.state).foo);

    expect(runInstance1.whatDependenciesStateChange()).toBe(false);

    store.dispatch(myAction('xyz'));

    expect(runInstance1.whatDependenciesStateChange()).toBe('foo');

    let runInstance2 = runInstance1.newRun();

    expect(runInstance2.whatDependenciesStateChange()).toBe(false);

    runInstance2.addTrackedField(sliceA, 'foo', sliceA.get(store.state).foo);

    expect(runInstance2.whatDependenciesStateChange()).toBe(false);
  });

  it('should only focus on the tracked field and ignore other fields in the slice', () => {
    let updateField = sliceB.action((val: string) => {
      return sliceB.tx((state) => {
        return sliceB.update(state, { sliceBField: val });
      });
    });

    let updateOtherField = sliceB.action((val: string) => {
      return sliceB.tx((state) => {
        return sliceB.update(state, { sliceBOtherField: val });
      });
    });

    let runInstance1 = new RunInstance(store, 'test');
    runInstance1.addTrackedField(
      sliceB,
      'sliceBField',
      sliceB.get(store.state).sliceBField,
    );

    expect(runInstance1.whatDependenciesStateChange()).toBe(false);

    store.dispatch(updateOtherField('xyz'));

    expect(runInstance1.whatDependenciesStateChange()).toBe(false);

    store.dispatch(updateField('xyz'));

    expect(runInstance1.whatDependenciesStateChange()).toBe('sliceBField');
  });
});

describe('#newRun', () => {
  it('executes all cleanup callbacks on creating a new RunInstance', () => {
    const runInstance = new RunInstance(store, 'test');
    const cleanupCallback1 = jest.fn();
    const cleanupCallback2 = jest.fn();

    runInstance.addCleanup(cleanupCallback1);
    runInstance.addCleanup(cleanupCallback2);

    let runInstance2 = runInstance.newRun();
    expect(runInstance.newRun()).toBeInstanceOf(RunInstance);

    expect(cleanupCallback1).toBeCalledTimes(1);
    expect(cleanupCallback2).toBeCalledTimes(1);

    expect(runInstance2.newRun()).toBeInstanceOf(RunInstance);

    expect(cleanupCallback2).toBeCalledTimes(1);
  });

  it('creates a fresh RunInstance  without carrying forward any tracked fields', () => {
    const initialRunInstance = new RunInstance(store, 'test');
    initialRunInstance.addTrackedField(sliceA, 'property', 'value');
    expect(initialRunInstance.dependencies.has(sliceA)).toBe(true);

    const newRunInstance = initialRunInstance.newRun();

    expect(newRunInstance.dependencies.has(sliceA)).toBe(false);
  });
});
