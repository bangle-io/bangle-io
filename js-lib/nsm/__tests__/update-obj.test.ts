import { updateState } from '../index';

test('works', () => {
  let data = {
    foo: false,
    number: 3,
  };
  const updateObj = updateState(data);

  expect(updateObj(data, (i) => ({}))).toEqual({
    foo: false,
    number: 3,
  });

  expect(
    updateObj(data, (i) => ({
      number: i.number + 1,
    })),
  ).toEqual({
    foo: false,
    number: 4,
  });

  expect(updateObj(data, { number: 1 })).toEqual({
    foo: false,
    number: 1,
  });
});

test('works with override', () => {
  let data = {
    foo: false,
    number: 3,
  };
  const updateObj = updateState(data, (newState, oldState) => {
    return {
      ...newState,
      number: 1,
    };
  });

  expect(updateObj(data, (i) => ({}))).toEqual({
    foo: false,
    number: 1,
  });

  expect(
    updateObj(data, (i) => ({
      number: i.number + 1,
    })),
  ).toEqual({
    foo: false,
    number: 1,
  });

  expect(updateObj(data, { number: 1 })).toEqual({
    foo: false,
    number: 1,
  });
});

test('provides correct values to override', () => {
  const data = {
    foo: false,
    number: 3,
  };
  const updateObj = updateState(data, (newState, oldState) => {
    expect(oldState).toEqual(data);
    expect(newState).toEqual({
      foo: false,
      number: 4,
    });

    return {
      ...newState,
      number: 0,
    };
  });

  expect(
    updateObj(data, (i) => ({
      number: i.number + 1,
    })),
  ).toEqual({
    foo: false,
    number: 0,
  });
});
