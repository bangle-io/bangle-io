import { slice, sliceKey } from '../../slice';
import { testCleanup } from '../../helpers/test-cleanup';
import { Store } from '../../store';
import waitForExpect from 'wait-for-expect';
import { effect } from '../effect';
import { cleanup } from '../../cleanup';

beforeEach(() => {
  testCleanup();
});

function sleep(t = 1): Promise<void> {
  return new Promise((res) => setTimeout(res, t));
}

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

const sliceCDepBKey = sliceKey([sliceB], {
  name: 'sliceCDepB',
  state: { sliceCDepBField: 'value:sliceCDepBField' },
});

const sliceCDepBSelector1 = sliceCDepBKey.selector(
  (state) => {
    return (
      sliceCDepBKey.get(state).sliceCDepBField +
      ':' +
      sliceB.get(state).sliceBField1
    );
  },
  {
    equal: (a, b) => {
      return a === b;
    },
  },
);

const sliceCDepBSelector2 = sliceCDepBKey.selector(
  (state) => {
    return sliceCDepBKey.get(state).sliceCDepBField + ':selector2';
  },
  {
    equal: (a, b) => {
      return a === b;
    },
  },
);

const sliceCDepB = sliceCDepBKey.slice({
  derivedState: {
    sliceCDepBSelector1,
    sliceCDepBSelector2,
  },
});

describe('effect with store', () => {
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

    const updateSliceCDepBField = sliceCDepB.action((val: string) => {
      return sliceCDepB.tx((state) => {
        return sliceCDepB.update(state, { sliceCDepBField: val });
      });
    });

    const store = Store.create({
      storeName: 'test',
      slices: [sliceA, sliceB, sliceCDepB],
    });

    return {
      store,
      sliceA,
      sliceB,
      sliceCDepB,
      updateSliceAField1,
      updateSliceAField2,
      updateSliceBField1,
      updateSliceCDepBField,
    };
  };

  test('runs effect on mount', async () => {
    const { store } = setup();

    const called = jest.fn();

    store.effect(called);

    await waitForExpect(() => {
      expect(called).toHaveBeenCalledTimes(1);
    });
  });

  test('multiple dispatches trigger one effect', async () => {
    const { store, sliceA, updateSliceAField1 } = setup();

    const effectCalled = jest.fn();

    const eff = store.effect(
      (effectStore) => {
        const { sliceAField1 } = sliceA.track(effectStore);

        effectCalled(sliceAField1);
      },
      {
        deferred: false,
      },
    );

    await waitForExpect(() => {
      expect(effectCalled).toHaveBeenCalledTimes(1);
    });

    expect(effectCalled).toHaveBeenLastCalledWith('value:sliceAField1');

    store.dispatch(updateSliceAField1('new-value'));
    store.dispatch(updateSliceAField1('new-value2'));
    store.dispatch(updateSliceAField1('new-value3'));

    await waitForExpect(() => {
      expect(effectCalled).toBeCalledTimes(2);
    });

    expect(effectCalled).toHaveBeenLastCalledWith('new-value3');
  });

  test('should not run effect if the field it is watching does not change', async () => {
    const { store, sliceA, updateSliceAField1 } = setup();

    let effectCalled = jest.fn();

    store.effect(
      function effect2(store) {
        const { sliceAField2 } = sliceA.track(store);

        effectCalled(sliceAField2);
      },
      {
        deferred: false,
      },
    );

    await waitForExpect(() => {
      expect(effectCalled).toHaveBeenCalledTimes(1);
    });

    expect(effectCalled).toHaveBeenLastCalledWith('value:sliceAField2');

    store.dispatch(updateSliceAField1('new-value'));

    await sleep(5);

    expect(effectCalled).toBeCalledTimes(1);
  });

  test('should run effect if the field it is watching changes', async () => {
    const { store, sliceA, updateSliceAField2 } = setup();

    let effectCalled = jest.fn();

    store.effect(
      function effect2(store) {
        const { sliceAField2 } = sliceA.track(store);

        effectCalled(sliceAField2);
      },
      {
        deferred: false,
      },
    );

    await waitForExpect(() => {
      expect(effectCalled).toHaveBeenCalledTimes(1);
    });

    expect(effectCalled).toHaveBeenLastCalledWith('value:sliceAField2');

    store.dispatch(updateSliceAField2('new-value'));

    await sleep(5);

    expect(effectCalled).toBeCalledTimes(2);
    expect(effectCalled).toHaveBeenLastCalledWith('new-value');
  });

  test('should run effect for dependent slice', async () => {
    const { store, sliceB, updateSliceBField1, sliceCDepB } = setup();

    let effect1Called = jest.fn();
    let effect2Called = jest.fn();
    let effect3Called = jest.fn();

    const selector2InitValue = 'value:sliceCDepBField:selector2';

    expect(sliceCDepB.get(store.state).sliceCDepBSelector2).toBe(
      selector2InitValue,
    );

    store.effect(
      function effect1(store) {
        const { sliceCDepBSelector1 } = sliceCDepB.track(store);

        effect1Called(sliceCDepBSelector1);
      },
      {
        deferred: false,
      },
    );

    store.effect(
      function effect2(store) {
        const { sliceCDepBSelector2 } = sliceCDepB.track(store);

        effect2Called(sliceCDepBSelector2);
      },
      {
        deferred: false,
      },
    );

    store.effect(
      function effect3(store) {
        const { sliceCDepBField } = sliceCDepB.track(store);

        effect3Called(sliceCDepBField);
      },
      {
        deferred: false,
      },
    );

    await waitForExpect(() => {
      expect(effect1Called).toHaveBeenCalledTimes(1);
    });

    expect(effect1Called).toHaveBeenLastCalledWith(
      'value:sliceCDepBField:value:sliceBField1',
    );

    store.dispatch(updateSliceBField1('new-value'));

    await sleep(5);

    expect(sliceB.get(store.state).sliceBField1).toBe('new-value');

    // selector1 should be changed
    expect(sliceCDepB.get(store.state).sliceCDepBSelector1).toBe(
      'value:sliceCDepBField:new-value',
    );

    // selector2 should not be changed
    expect(sliceCDepB.get(store.state).sliceCDepBSelector2).toBe(
      selector2InitValue,
    );

    expect(effect1Called).toBeCalledTimes(2);
    expect(effect1Called).toHaveBeenLastCalledWith(
      sliceCDepB.get(store.state).sliceCDepBSelector1,
    );

    // effect 2 should not be called as selector 2 did not change
    expect(effect2Called).toBeCalledTimes(1);
    // effect 3 should not be called as sliceCDepBField did not change
    expect(effect3Called).toBeCalledTimes(1);
  });

  describe('cleanup', () => {
    test('should run cleanup when effect runs again', async () => {
      const { store, sliceA, updateSliceAField1 } = setup();

      const cleanupCalled = jest.fn();
      const effectCalled = jest.fn();

      const eff = store.effect(
        (effectStore) => {
          const { sliceAField1 } = sliceA.track(effectStore);

          effectCalled(sliceAField1);

          cleanup(effectStore, cleanupCalled);
        },
        {
          deferred: false,
        },
      );

      await waitForExpect(() => {
        expect(effectCalled).toHaveBeenCalledTimes(1);
      });

      expect(effectCalled).toHaveBeenLastCalledWith('value:sliceAField1');

      store.dispatch(updateSliceAField1('new-value'));
      store.dispatch(updateSliceAField1('new-value2'));
      store.dispatch(updateSliceAField1('new-value3'));

      await waitForExpect(() => {
        expect(cleanupCalled).toHaveBeenCalledTimes(1);
      });

      expect(effectCalled).toBeCalledTimes(2);
      expect(cleanupCalled).toBeCalledTimes(1);
    });

    test('should run cleanup function when destroyed', async () => {
      const { store, sliceB } = setup();

      const cleanupCalled = jest.fn();
      const effectCalled = jest.fn();

      const eff = store.effect(
        (effectStore) => {
          const { sliceBField1 } = sliceB.track(effectStore);

          effectCalled(sliceBField1);

          cleanup(effectStore, cleanupCalled);
        },
        { deferred: false },
      );

      await waitForExpect(() => {
        expect(effectCalled).toHaveBeenCalledTimes(1);
      });

      eff.destroy();

      await sleep(5);

      expect(cleanupCalled).toBeCalledTimes(1);
    });

    test('effect should not run after it is destroyed', async () => {
      const { store, updateSliceBField1 } = setup();

      const effectCalled = jest.fn();

      const eff = store.effect((store) => {
        const { sliceBField1 } = sliceB.track(store);

        effectCalled(sliceBField1);
      });

      await waitForExpect(() => {
        expect(effectCalled).toHaveBeenCalledTimes(1);
      });

      eff.destroy();

      store.dispatch(updateSliceBField1('new-value'));

      await sleep(5);

      expect(effectCalled).toBeCalledTimes(1);
    });
  });

  describe('effects tracking', () => {
    const setup2 = () => {
      const {
        store,
        updateSliceAField1,
        updateSliceAField2,
        updateSliceBField1,
        updateSliceCDepBField,
      } = setup();

      let effect1 = jest.fn();
      let effect2 = jest.fn();
      let effect3 = jest.fn();
      let effect4 = jest.fn();
      let effect5 = jest.fn();

      store.effect(
        function effectCb1(store) {
          const { sliceAField1 } = sliceA.track(store);
          effect1(sliceAField1);
        },
        { deferred: false },
      );

      store.effect(
        function effectCb2(store) {
          const { sliceAField1 } = sliceA.track(store);
          const { sliceBField1 } = sliceB.track(store);

          effect2(sliceAField1, sliceBField1);
        },
        { deferred: false },
      );

      store.effect(
        function effectCb3(store) {
          effect3();
        },
        { deferred: false },
      );

      store.effect(
        function effectCb4(store) {
          const { sliceAField1, sliceAField2 } = sliceA.track(store);
          const { sliceBField1 } = sliceB.track(store);
          const { sliceCDepBField, sliceCDepBSelector1 } =
            sliceCDepB.track(store);

          effect4(
            sliceAField1,
            sliceAField2,
            sliceBField1,
            sliceCDepBField,
            sliceCDepBSelector1,
          );
        },
        { deferred: false },
      );

      store.effect(
        function effectCb5(store) {
          const { sliceCDepBSelector1 } = sliceCDepB.track(store);
          effect5(sliceCDepBSelector1);
        },
        { deferred: false },
      );

      return {
        store,
        updateSliceAField1,
        updateSliceAField2,
        updateSliceBField1,
        updateSliceCDepBField,
        effect1,
        effect2,
        effect3,
        effect4,
        effect5,
      };
    };

    test('effect1 tracks sliceAField1', async () => {
      const { store, effect1, updateSliceAField1 } = setup2();
      await sleep(5);

      store.dispatch(updateSliceAField1('new-value'));
      await sleep(5);
      expect(effect1).toHaveBeenCalledTimes(2);
      expect(effect1).toHaveBeenLastCalledWith('new-value');
    });

    test('effect2 tracks sliceAField1, sliceBField1', async () => {
      const { store, effect2, updateSliceAField1, updateSliceBField1 } =
        setup2();

      await sleep(5);

      store.dispatch(updateSliceAField1('new-valueA'));
      store.dispatch(updateSliceBField1('new-valueB'));
      await sleep(5);

      expect(effect2).toHaveBeenCalledTimes(2);
    });

    test('effect3 tracks nothing', async () => {
      const { store, effect3, updateSliceAField1, updateSliceBField1 } =
        setup2();

      store.dispatch(updateSliceAField1('new-value'));
      await sleep(5);

      store.dispatch(updateSliceBField1('new-value'));
      await sleep(5);

      await sleep(5);
      expect(effect3).toHaveBeenCalledTimes(1);
    });

    test('effect4 tracks sliceAField1, sliceAField2, sliceBField1, sliceCDepBField, sliceCDepBSelector1', async () => {
      const {
        store,
        effect4,
        updateSliceAField1,
        updateSliceAField2,
        updateSliceBField1,
        updateSliceCDepBField,
      } = setup2();
      await sleep(5);

      store.dispatch(updateSliceAField1('new-value:updateSliceAField1'));
      store.dispatch(updateSliceAField2('new-value:updateSliceAField2'));
      store.dispatch(updateSliceBField1('new-value:updateSliceBField1'));
      store.dispatch(updateSliceCDepBField('new-value:updateSliceCDepBField'));
      await sleep(5);

      expect(effect4).toHaveBeenCalledTimes(2);

      expect(effect4).nthCalledWith(
        2,
        'new-value:updateSliceAField1',
        'new-value:updateSliceAField2',
        'new-value:updateSliceBField1',
        'new-value:updateSliceCDepBField',
        'new-value:updateSliceCDepBField:new-value:updateSliceBField1',
      );

      store.dispatch(updateSliceAField1('new-new-value:updateSliceAField1'));

      await sleep(5);

      expect(effect4).toHaveBeenCalledTimes(3);

      // updating same value should not trigger effect
      store.dispatch(updateSliceAField1('new-new-value:updateSliceAField1'));

      await sleep(5);

      expect(effect4).toHaveBeenCalledTimes(3);

      // updating to an older value should trigger
      store.dispatch(updateSliceAField1('new-value:updateSliceAField1'));

      await sleep(15);
      expect(effect4).toHaveBeenCalledTimes(4);
    });

    test('effect5 tracks sliceCDepBSelector1', async () => {
      const { store, effect5, updateSliceCDepBField } = setup2();
      await sleep(5);

      store.dispatch(updateSliceCDepBField('new-value'));
      await sleep(5);
      expect(effect5).toHaveBeenCalledTimes(2);
    });
  });
});

describe('effect only', () => {
  const setup = () => {
    const callback = jest.fn();
    const store = Store.create({
      storeName: 'test',
      slices: [sliceA, sliceB, sliceCDepB],
    });
    return {
      effect: effect(
        () => {
          callback();
        },
        {
          deferred: false,
        },
      )(store),
      callback,
      store,
    };
  };

  test('does not run the effect if shouldQueueRun returns false', async () => {
    const { effect, callback } = setup();
    jest.spyOn(effect, 'shouldQueueRun' as any).mockReturnValue(false);

    effect.run();

    await sleep(5);

    expect(callback).not.toHaveBeenCalled();
  });

  test('does not run the effect if there is a pendingRun', async () => {
    const { effect, callback } = setup();
    effect['pendingRun'] = true;

    effect.run();

    await sleep(5);

    expect(callback).not.toHaveBeenCalled();
  });

  test('runs the effect if it has not run once', async () => {
    const { effect, callback } = setup();

    effect.run();

    await sleep(5);

    expect(callback).toHaveBeenCalled();
  });

  test('runs the effect if it has run once and dependencies have changed', async () => {
    const { effect, callback } = setup();

    effect.run();

    await sleep(5);

    jest
      .spyOn(effect['runInstance'], 'whatDependenciesStateChange')
      .mockReturnValue('someChange');

    effect.run();
    await sleep(5);

    expect(callback).toHaveBeenCalledTimes(2);
  });

  test('does not run the effect if it has run once and dependencies have not changed', async () => {
    const { effect, callback } = setup();
    effect.run();

    await sleep(5);
    expect(callback).toHaveBeenCalledTimes(1);

    jest
      .spyOn(effect['runInstance'], 'whatDependenciesStateChange')
      .mockReturnValue(false);

    effect.run();

    await sleep(5);

    expect(callback).toHaveBeenCalledTimes(1);
  });
});
