import { BaseError } from '../index';

test('works', () => {
  const error = new BaseError({ message: 'test' });

  expect(error).toMatchInlineSnapshot(`[BaseError: test]`);
});
