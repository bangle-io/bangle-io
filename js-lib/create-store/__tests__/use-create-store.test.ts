import { act, renderHook } from '@testing-library/react-hooks';

import { useStore } from '../use-store';

const reducer = (state: { content: any; counter: number }, action) => {
  if (action.type === 'UPDATE_CONTENT') {
    return {
      ...state,
      content: action.value,
    };
  } else if (action.type === 'INCREMENT') {
    return {
      ...state,
      counter: state.counter + 1,
    };
  }
  return state;
};

test('works correctly', async () => {
  let render = renderHook(() =>
    useStore(reducer, { content: 'banana', counter: 0 }),
  );

  expect(render.result.current).toEqual([
    { content: 'banana', counter: 0 },
    expect.any(Function),
  ]);
});

test('dispatches actions', async () => {
  let render = renderHook(() =>
    useStore(reducer, { content: 'banana', counter: 0 }),
  );

  const dispatch: any = render.result.current[1];
  act(() => {
    dispatch({ type: 'INCREMENT' });
  });

  expect(render.result.current).toEqual([
    { content: 'banana', counter: 1 },
    dispatch,
  ]);

  act(() => {
    dispatch({ type: 'INCREMENT' });
  });

  expect(render.result.current[1]).toBe(dispatch);
  expect(render.result.current).toEqual([
    { content: 'banana', counter: 2 },
    dispatch,
  ]);
});

test('unmounting destroys', async () => {
  let render = renderHook(() =>
    useStore(reducer, { content: 'banana', counter: 0 }),
  );

  const dispatch: any = render.result.current[1];
  act(() => {
    dispatch({ type: 'INCREMENT' });
  });

  render.unmount();

  act(() => {
    dispatch({ type: 'INCREMENT' });
  });

  expect(render.result.current).toEqual([
    { content: 'banana', counter: 1 },
    dispatch,
  ]);
});
