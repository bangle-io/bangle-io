import { AppState } from '../app-state';
import { Slice } from '../app-state-slice';
import { SliceKey } from '../slice-key';

describe('AppState', () => {
  test('empty slices', () => {
    const appState = AppState.create({ slices: [] });

    expect(appState).toMatchInlineSnapshot(`
      AppState {
        "config": AppStateConfig {
          "fields": [],
          "opts": undefined,
          "slices": [],
          "slicesByKey": {},
        },
        "slicesCurrentState": {},
      }
    `);
  });

  test('with a slice', () => {
    const slice = new Slice({
      state: {
        init: () => null,
      },
    });

    const appState = AppState.create({ slices: [slice] });

    expect(appState.getSliceState('slice$')).toBe(null);
    expect(appState.getSliceByKey('slice$')).toBe(slice);
    expect(appState).toMatchSnapshot();
  });

  test('using same key throws error', () => {
    const key1 = new SliceKey<null>('one');

    expect(() =>
      AppState.create({
        slices: [
          new Slice({
            key: key1,
            state: {
              init: () => null,
            },
          }),
          new Slice({
            key: key1,
            state: {
              init: () => null,
            },
          }),
        ],
      }),
    ).toThrowErrorMatchingInlineSnapshot(
      `"Adding different instances of an existing slice (one$)"`,
    );
  });

  test('applying action preserves states of those who donot have apply', () => {
    const key1 = new SliceKey<number>('one');

    const slice = new Slice({
      key: key1,
      state: {
        init: () => 0,
      },
    });

    const appState = AppState.create({ slices: [slice] });
    expect(key1.getSliceState(appState)).toBe(0);

    let newAppState = appState.applyAction({ name: 'my-action' });
    expect(key1.getSliceState(newAppState)).toBe(0);
  });

  test('applying action preserves states for  apply which returns prev state', () => {
    let initialValue = {};
    const key1 = new SliceKey<{}>('one');

    const slice = new Slice({
      key: key1,
      state: {
        init: () => initialValue,
        apply: (_, val) => val,
      },
    });

    const appState = AppState.create({ slices: [slice] });
    expect(key1.getSliceState(appState)).toBe(initialValue);

    let newAppState = appState.applyAction({ name: 'my-action' });
    expect(key1.getSliceState(newAppState)).toBe(initialValue);
  });

  test('calls state methods correctly', () => {
    const key1 = new SliceKey<number>('one');

    let init = jest.fn(() => {
      return 0;
    });
    let apply = jest.fn(() => 1);
    const slice = new Slice({
      key: key1,
      state: {
        init,
        apply,
      },
    });

    const appState = AppState.create({ slices: [slice], opts: { kj: true } });
    expect(init).toBeCalledTimes(1);
    expect(apply).toBeCalledTimes(0);
    expect(init).nthCalledWith(1, { kj: true }, appState);

    let action = {
      name: 'for-b',
      value: { no: 77 },
    };
    let newAppState = appState.applyAction(action);
    expect(init).toBeCalledTimes(1);
    expect(apply).toBeCalledTimes(1);
    expect(apply).nthCalledWith(1, action, 0, newAppState);
  });

  test('calls with a partial state', () => {
    const sliceKeyA = new SliceKey('a');
    const sliceKeyB = new SliceKey('b');

    let partialStateCheck;

    const sliceA = new Slice({
      key: sliceKeyA,
      state: {
        init: () => 1,
        apply: (action, value, appState) => {
          if (action.name === 'for-a') {
            return action.value.no;
          }

          return value;
        },
      },
    });

    const sliceB = new Slice({
      key: sliceKeyB,
      state: {
        init: () => 2,
        apply: (action, value, appState) => {
          partialStateCheck = sliceA.getSliceState(appState);

          return value;
        },
      },
    });

    const appState = AppState.create({ slices: [sliceA, sliceB] });

    let action = {
      name: 'for-a',
      value: { no: 77 },
    };
    appState.applyAction(action);
    // Should have access to A's state
    expect(partialStateCheck).toBe(77);
  });

  test('called with the right this', () => {
    const key1 = new SliceKey<number>('one');
    let initThis;
    let applyThis;
    const slice = new Slice({
      key: key1,
      state: {
        init() {
          initThis = this;

          return 0;
        },
        apply(action, val) {
          applyThis = this;

          return val;
        },
      },
    });

    const appState = AppState.create({ slices: [slice] });

    let action = {
      name: 'for-b',
      value: { no: 77 },
    };
    appState.applyAction(action);

    expect(initThis).toBe(slice);
    expect(applyThis).toBe(slice);
  });

  test('with multiple slices', () => {
    const key1 = new SliceKey<number>('one');
    const slice1 = new Slice({
      key: key1,
      state: {
        init: () => 1,
      },
    });
    const key2 = new SliceKey<number>('two');

    const slice2 = new Slice({
      key: key2,
      state: {
        init: () => 2,
      },
    });

    const appState = AppState.create({ slices: [slice1, slice2] });

    expect(key1.getSliceState(appState)).toBe(1);
    expect(key1.getSlice(appState)).toBe(slice1);
    expect(appState.getSliceState(key1.key)).toBe(1);
    expect(appState.getSliceByKey(key1.key)).toBe(slice1);

    expect(key2.getSliceState(appState)).toBe(2);
    expect(key2.getSlice(appState)).toBe(slice2);
    expect(appState.getSliceState(key2.key)).toBe(2);
    expect(appState.getSliceByKey(key2.key)).toBe(slice2);

    expect(appState).toMatchSnapshot();
  });

  test('updating a slice', () => {
    const sliceKey = new SliceKey('one');
    const slice = new Slice({
      key: sliceKey,
      state: {
        init: () => 1,
        apply: (_, val) => val + 1,
      },
    });

    let appState = AppState.create({ slices: [slice] });

    expect(sliceKey.getSliceState(appState)).toBe(1);

    let newAppState = appState.applyAction({ name: 'hi' });

    expect(newAppState).not.toBe(appState);

    expect(sliceKey.getSliceState(appState)).toBe(1);
    expect(sliceKey.getSliceState(newAppState)).toBe(2);
  });

  test('updating multiple slice', () => {
    const sliceKeyA = new SliceKey<number, ActionType>('a');
    const sliceKeyB = new SliceKey<number, ActionType>('b');

    type ActionType =
      | {
          name: 'for-a';
          value: { n: number };
        }
      | {
          name: 'for-b';
          value: { n: number };
        };

    const sliceA = new Slice({
      key: sliceKeyA,
      state: {
        init: () => 1,
        apply: (action, value, appState) => {
          if (action.name === 'for-a') {
            return action.value.n;
          }

          return value;
        },
      },
    });

    const sliceB = new Slice({
      key: sliceKeyB,
      state: {
        init: () => 2,
        apply: (action, value, appState) => {
          if (action.name === 'for-b') {
            return action.value.n;
          }

          return value;
        },
      },
    });

    let appState = AppState.create({ slices: [sliceA, sliceB] });

    expect(sliceKeyA.getSliceState(appState)).toBe(1);

    let newAppState = appState.applyAction({
      name: 'for-a',
      value: { n: 99 },
    });

    expect(newAppState).not.toBe(appState);
    // check new state
    expect(sliceKeyA.getSliceState(newAppState)).toBe(99);
    expect(sliceKeyB.getSliceState(newAppState)).toBe(2);

    // check old state
    expect(sliceKeyA.getSliceState(appState)).toBe(1);
    expect(sliceKeyB.getSliceState(appState)).toBe(2);

    newAppState = newAppState.applyAction({
      name: 'for-b',
      value: { n: 77 },
    });

    expect(sliceKeyA.getSliceState(newAppState)).toBe(99);
    expect(sliceKeyB.getSliceState(newAppState)).toBe(77);
  });

  describe('serialization', () => {
    test('serializes correctly', () => {
      const key1 = new SliceKey<any>('one');

      const slice1 = new Slice({
        key: key1,
        state: {
          init: () => ({ number: 3 }),
          stateToJSON: (val) => val.number,
          stateFromJSON: (config, val, appState) => ({ number: val }),
        },
      });

      const slice2 = new Slice({
        state: {
          init: () => 4,
        },
      });

      let state = AppState.create({
        slices: [slice1, slice2],
      });

      const sliceFields = { myslice1: slice1, myslice2: slice2 };
      const json = state.stateToJSON({ sliceFields: sliceFields });
      expect(json).toMatchInlineSnapshot(`
        {
          "myslice1": 3,
        }
      `);

      const parsedState = AppState.stateFromJSON({
        slices: [slice1, slice2],
        json,
        sliceFields,
      });
      expect(slice1.getSliceState(parsedState)).toEqual({ number: 3 });
      expect(slice2.getSliceState(parsedState)).toBe(4);
    });

    test('skips serialization if no field name provided', () => {
      const key1 = new SliceKey<any>('one');

      const slice1 = new Slice({
        key: key1,
        state: {
          init: () => ({ number: 3 }),
          stateToJSON: (val) => val.number,
          stateFromJSON: (config, val, appState) => ({ number: val }),
        },
      });

      let state = AppState.create({
        slices: [slice1],
      });

      const sliceFields = {};
      const json = state.stateToJSON({ sliceFields: sliceFields });
      expect(json).toMatchInlineSnapshot(`{}`);

      const parsedState = AppState.stateFromJSON({
        slices: [slice1],
        json,
        sliceFields,
      });
      expect(slice1.getSliceState(parsedState)).toEqual({ number: 3 });
    });
  });

  describe('append action', () => {
    test('calls apply correctly', () => {
      const key1 = new SliceKey<number>('one');

      let apply = jest.fn((_, val) => val + 1);

      const slice = new Slice({
        key: key1,
        state: {
          init: () => 0,
          apply: apply,
        },
        appendAction(actions) {
          if (actions.some((a) => a.name === 'for-b')) {
            return {
              name: 'for-b-appended',
            };
          }

          return undefined;
        },
      });

      const appState = AppState.create({ slices: [slice] });
      expect(apply).toBeCalledTimes(0);

      let action = {
        name: 'for-b',
        value: { no: 77 },
      };

      let newAppState = appState.applyAction(action);

      expect(apply).toBeCalledTimes(2);

      expect(apply).nthCalledWith(1, action, 0, expect.any(AppState));
      expect(apply.mock.calls[1]?.[0]).toEqual({
        appendedFrom: 'for-b',
        name: 'for-b-appended',
      });
      expect(apply.mock.calls[1]?.[1]).toEqual(1);

      // should not have any effect
      appState.applyAction({
        name: 'something-else',
        value: { no: 77 },
      });

      expect(key1.getSliceState(newAppState)).toEqual(2);
      expect(apply).toBeCalledTimes(3);
    });

    test('fund test', () => {
      const key1 = new SliceKey<string>('one');

      const slice1 = new Slice({
        key: key1,
        state: {
          init: () => '👻',
          apply: (action, value) => value + action.value.emoji,
        },
        appendAction(actions, state) {
          if (actions.some((a) => a.name.startsWith('interesting-action'))) {
            return {
              name: 'appended-action',
              value: { emoji: '💩' },
            };
          }

          return undefined;
        },
      });

      const state = AppState.create({ slices: [slice1] });
      const newState = state.applyAction({
        name: 'interesting-action',
        value: {
          emoji: '🐔',
        },
      });

      expect(key1.getSliceState(newState)).toMatchInlineSnapshot(`"👻🐔💩"`);
    });

    test('multiple appends', () => {
      const key1 = new SliceKey<string>('one');
      const key2 = new SliceKey<string>('two');
      const slice1Actions: any[] = [];

      const slice1 = new Slice({
        key: key1,
        state: {
          init: () => 'Slice1:',
          apply: (action, value) => value + action.value.data,
        },
        appendAction(actions): any {
          slice1Actions.push([...actions]);

          if (actions.some((a) => a.name.startsWith('2-'))) {
            return {
              name: '1-appended',
              value: { data: '1 ' },
            };
          }

          return undefined;
        },
      });

      let times = 0;

      const slice2Actions: any[] = [];
      const slice2 = new Slice({
        key: key2,
        state: {
          init: () => 'Slice2:',
          apply: (action, value) => value + action.value.data,
        },
        appendAction(actions): any {
          slice2Actions.push([...actions]);

          if (
            (actions.some((a) => a.name.startsWith('1-')) && times < 4) ||
            actions[0].name === 'start'
          ) {
            times++;

            return {
              name: '2-appended-' + times,
              value: { data: '2 ' },
            };
          }

          return undefined;
        },
      });

      const appState = AppState.create({ slices: [slice1, slice2] });
      let newState = appState.applyAction({
        name: 'start',
        value: { data: 'start ' },
      });

      expect(key1.getSliceState(newState)).toEqual(
        'Slice1:start 2 1 2 1 2 1 2 1 ',
      );
      expect(key2.getSliceState(newState)).toEqual(
        'Slice2:start 2 1 2 1 2 1 2 1 ',
      );

      expect(slice1Actions).toEqual([
        [
          {
            name: 'start',
            value: { data: 'start ' },
          },
        ],
        [
          {
            appendedFrom: 'start',
            name: '2-appended-1',
            value: { data: '2 ' },
          },
        ],
        [
          {
            appendedFrom: 'start',
            name: '2-appended-2',
            value: { data: '2 ' },
          },
        ],
        [
          {
            appendedFrom: 'start',
            name: '2-appended-3',
            value: { data: '2 ' },
          },
        ],
        [
          {
            appendedFrom: 'start',
            name: '2-appended-4',
            value: { data: '2 ' },
          },
        ],
      ]);
      expect(slice2Actions).toEqual([
        [
          {
            name: 'start',
            value: { data: 'start ' },
          },
        ],
        [
          {
            appendedFrom: 'start',
            name: '1-appended',
            value: { data: '1 ' },
          },
        ],
        [
          {
            appendedFrom: 'start',
            name: '1-appended',
            value: { data: '1 ' },
          },
        ],
        [
          {
            appendedFrom: 'start',
            name: '1-appended',
            value: { data: '1 ' },
          },
        ],
        [
          {
            appendedFrom: 'start',
            name: '1-appended',
            value: { data: '1 ' },
          },
        ],
      ]);
    });
  });
});
