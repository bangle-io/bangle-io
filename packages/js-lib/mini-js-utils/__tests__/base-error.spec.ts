import { expect, test } from 'vitest';
import { BaseError } from '../base-error';

test('works', () => {
  const cause = new Error('upstream failure');
  const error = new BaseError({ message: 'test', cause });

  expect(error).toMatchInlineSnapshot('[BaseError: test]');
  expect(error.cause).toBe(cause);
});
