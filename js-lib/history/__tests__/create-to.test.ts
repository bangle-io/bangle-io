import { createTo } from '../create-to';
import { MemoryHistory } from '../memory-history';

test('works 1', () => {
  expect(
    createTo({ pathname: '/ws' }, new MemoryHistory('', jest.fn())),
  ).toEqual('/ws');
});

test('throws error if malformed search', () => {
  expect(() =>
    createTo(
      { pathname: '/ws', search: '?my' },
      new MemoryHistory('', jest.fn()),
    ),
  ).toThrowErrorMatchingInlineSnapshot(`"Location search cannot start with ?"`);
});

test('works with search', () => {
  expect(
    createTo(
      { pathname: '/ws', search: 'my' },
      new MemoryHistory('', jest.fn()),
    ),
  ).toBe('/ws?my');
});

test('works when pathname is undefined', () => {
  expect(createTo({ search: 'my' }, new MemoryHistory('', jest.fn()))).toBe(
    '?my',
  );
});

test('uses existing pathname as fallback', () => {
  const history = new MemoryHistory('', jest.fn());

  history.navigate('/my-path');
  expect(createTo({ search: 'my' }, history)).toBe('/my-path?my');
});

test('uses existing search as fallback', () => {
  const history = new MemoryHistory('', jest.fn());

  history.navigate('/?my-search');
  expect(createTo({ pathname: '/test-path' }, history)).toBe(
    '/test-path?my-search',
  );
});
