import { mergeWsInfoRegistries } from '../helpers';

describe('mergeWsInfoRegistries', () => {
  test('merges correctly', () => {
    const two = mergeWsInfoRegistries({}, {});
    expect(two).toEqual({});
  });
});
