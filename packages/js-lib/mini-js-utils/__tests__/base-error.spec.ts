import { expect, test } from 'vitest';
import { BaseError } from '../base-error';

test('works', () => {
  const error = new BaseError({ message: 'test' });

  expect(error).toMatchInlineSnapshot('[BaseError: test]');
});
