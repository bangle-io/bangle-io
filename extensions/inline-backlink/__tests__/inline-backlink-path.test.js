import { getBacklinkPath } from '../utils';

describe('getBacklinkPath', () => {
  test('removes md extension', () => {
    const result = getBacklinkPath('test-ws:my-file.md', [
      'test-ws:xyz/my-file.md',
      'test-ws:some-path/hotel/the-file.md',
    ]);
    expect(result).toBe('my-file');
  });

  test('puts full path if two wsPaths have same name', () => {
    const result = getBacklinkPath('test-ws:some-path/hotel/my-file.md', [
      'test-ws:xyz/my-file.md',
      'test-ws:some-path/hotel/my-file.md',
    ]);
    expect(result).toBe('some-path/hotel/my-file');
  });

  test('if no match works', () => {
    const result = getBacklinkPath('test-ws:x-file.md', [
      'test-ws:xyz/my-file.md',
      'test-ws:some-path/hotel/my-file.md',
    ]);
    expect(result).toBe('x-file');
  });

  test('if no match and provided a nested wsPath', () => {
    const result = getBacklinkPath('test-ws:some-dir/x-file.md', [
      'test-ws:xyz/some-dir/my-file.md',
      'test-ws:some-path/hotel/my-file.md',
    ]);
    expect(result).toBe('some-dir/x-file');
  });
});
