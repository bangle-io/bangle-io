import { getPrimaryWsPath, wsPathToPathname } from '../helpers';

test('getPrimaryWsPath, works 1', () => {
  const result = getPrimaryWsPath('/ws/mojo/blah');
  expect(result).toBe('mojo:blah');
});

test('getPrimaryWsPath, works 2', () => {
  const result = getPrimaryWsPath('/ws/mojo');
  expect(result).toBe(undefined);
});

describe('wsPathToPathname', () => {
  test('works', () => {
    const result = wsPathToPathname('test:hello.md');
    expect(result).toEqual('/ws/test/hello.md');
  });

  test('works with a space', () => {
    const result = wsPathToPathname('test:hello micheal.md');
    expect(result).toEqual('/ws/test/hello%20micheal.md');
  });

  test('works with slashes', () => {
    const result = wsPathToPathname('test:hello/micheal.md');
    expect(result).toEqual('/ws/test/hello/micheal.md');
  });
});
