import { createStore } from '../create-store';

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

test('works correctly', () => {
  const store = createStore(reducer, { content: 'banana', counter: 0 });
  expect(store.getState()).toEqual({
    content: 'banana',
    counter: 0,
  });
});

test('dispatches actions', () => {
  const store = createStore(reducer, { content: 'banana', counter: 0 });
  let value: any[] = [];
  store.subscribe((s: any) => {
    value.push(s);
  });

  store.dispatch({ type: 'INCREMENT' });

  expect(value).toHaveLength(1);
  expect(value[0]).toEqual({
    content: 'banana',
    counter: 1,
  });
  expect(store.getState()).toEqual({
    content: 'banana',
    counter: 1,
  });

  store.dispatch({ type: 'INCREMENT' });
  expect(value).toHaveLength(2);
  expect(value[1]).toEqual({
    content: 'banana',
    counter: 2,
  });

  store.dispatch({ type: 'UPDATE_CONTENT', value: 'canada' });
  expect(value).toHaveLength(3);
  expect(value[2]).toEqual({
    content: 'canada',
    counter: 2,
  });
});

test('unsubscribe works', () => {
  const store = createStore(reducer, { content: 'banana', counter: 0 });
  let value: any[] = [];
  let unsubscribe = store.subscribe((s: any) => {
    value.push(s);
  });

  store.dispatch({ type: 'INCREMENT' });
  expect(value).toHaveLength(1);
  unsubscribe();
  store.dispatch({ type: 'INCREMENT' });
  expect(value).toHaveLength(1);
});

test('destroy works', () => {
  const store = createStore(reducer, { content: 'banana', counter: 0 });
  let value: any[] = [];
  store.subscribe((s: any) => {
    value.push(s);
  });

  store.dispatch({ type: 'INCREMENT' });
  expect(value).toHaveLength(1);
  store.destroy();
  store.dispatch({ type: 'INCREMENT' });
  expect(value).toHaveLength(1);
});
