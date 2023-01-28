import { actionToActionSnapshot, Slice, SliceKey } from '../slice';

const testSlice0 = new Slice({
  key: new SliceKey('test-0', { fun: false }),
  actions: {},
});

const testSlice1 = new Slice({
  key: new SliceKey('test-1', { bro: '' }),
  actions: {
    syn: (num: number) => (state, x) => {
      return { ...state };
    },
  },
});

test('with dependencies', () => {
  const s = new Slice({
    key: new SliceKey('test-X', { num: 1 }, { testSlice0, testSlice1 }),

    actions: {
      myAction:
        ({ num }: { num: number }) =>
        (state, x) => {
          return { ...state, num: num + (x.testSlice0.fun ? 1 : 0) };
        },
    },

    effects: [
      {
        update: (opts, { testSlice1 }) => {
          let f = opts.actions.myAction(1);

          let z = testSlice1.actions.syn(1);
        },
      },
      {
        update: (opts) => {},
      },
    ],
  });

  let f = s.actions.myAction({ num: 1 });

  expect(s.initState).toEqual({
    num: 1,
  });

  expect(s.uid).toMatchInlineSnapshot(`"test-X(test-0(),test-1())"`);
});

// test('with dependencies', () => {
//   const key = new SliceKey('test', {
//     num: 1,
//   });
//   const s = new Slice(key, { testSlice });

//   expect(s.initState).toEqual({
//     num: 1,
//   });
// });

describe('actionToActionSnapshot', () => {
  test('works', () => {
    const sliceKey = new SliceKey('test', { num: 1 });

    let actionSnapshot = actionToActionSnapshot(sliceKey, {
      myAction:
        ({ num }: { num: number }) =>
        (state) => {
          return state;
        },
    });

    expect(actionSnapshot).toEqual({
      myAction: expect.any(Function),
    });

    let result = actionSnapshot.myAction({ num: 2 });

    expect(result).toMatchInlineSnapshot(`
      {
        "actionName": "myAction",
        "payload": {
          "num": 2,
        },
        "sliceKey": "test",
      }
    `);
  });
});
