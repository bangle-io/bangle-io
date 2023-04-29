import { updateObj } from '../index';

test('works', () => {
  let data = {
    foo: false,
    number: 3,
  };
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
