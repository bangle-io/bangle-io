import { Slice } from '../slice';
import { State } from '../state';

test('applyAction works', () => {
  const slice = Slice.create({
    key: 'test',
    initState: { num: 1 },
    actions: {
      myAction: (num: number) => (state) => {
        return { ...state, num: num + state.num };
      },
    },
  });

  const state = State.create({
    storeName: 'test',
    slices: [slice],
  });

  const newState = state.applyAction({
    sliceKey: 'test',
    actionName: 'myAction',
    payload: [5],
  });

  expect(slice.getState(newState)).toEqual({
    num: 6,
  });
});
