import { BaseError } from '../index';

test('works', () => {
  const error = new BaseError({ message: 'test' });

  expect(error).toMatchInlineSnapshot(`[BaseError: test]`);
});

test('saves all the fields', () => {
  const error = new BaseError({
    message: 'test',
    code: 'code',
    thrower: 'thrower',
  });

  expect(Object.assign({}, error)).toEqual({
    code: 'code',
    name: 'BaseError',
    thrower: 'thrower',
  });

  const clonedError = BaseError.fromJsonValue(error.toJsonValue());

  expect(Object.assign({}, clonedError)).toEqual({
    code: 'code',
    name: 'BaseError',
    thrower: 'thrower',
  });
});
