import { APP_ENV, IS_TEST_ENV } from '@bangle.io/config';

test('jest gets the config', () => {
  expect(APP_ENV).toMatchInlineSnapshot(`"production"`);
  expect(IS_TEST_ENV).toBe(true);
});
