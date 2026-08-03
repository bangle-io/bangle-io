import { describe, expect, it } from 'vitest';
import { getShardArgs } from '../run-e2e-ci';

describe('getShardArgs', () => {
  it('runs the complete suite when no shard is configured', () => {
    expect(getShardArgs(undefined)).toEqual([]);
    expect(getShardArgs('')).toEqual([]);
  });

  it('returns a validated Playwright shard argument', () => {
    expect(getShardArgs('1/2')).toEqual(['--shard=1/2']);
    expect(getShardArgs('2/2')).toEqual(['--shard=2/2']);
  });

  it.each([
    '0/2',
    '3/2',
    '1/0',
    '1',
    '1/2/3',
    '1.5/2',
    '1/2.5',
  ])('rejects invalid shard value %s', (value) => {
    expect(() => getShardArgs(value)).toThrow(
      'BANGLE_E2E_SHARD must use Playwright shard syntax such as 1/2.',
    );
  });
});
