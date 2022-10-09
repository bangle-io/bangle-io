import { getNonConflictName } from '../helpers';

describe('getNonConflictName', () => {
  it('should return a conflict name case:1', () => {
    const conflictName = getNonConflictName('test:foo.md');
    expect(conflictName.includes('test:foo-conflict-')).toBe(true);
  });

  it('should return a conflict name case:2', () => {
    const conflictName = getNonConflictName('test:foo-conflict-1234.md');

    // should not add more `-conflicts-`
    expect(conflictName.split('conflict').length).toBe(2);

    expect(conflictName.includes('test:foo-conflict-')).toBe(true);
    expect(conflictName).not.toBe('test:foo-conflict-1234.md');
  });

  it('should return a conflict name case:3', () => {
    const conflictName = getNonConflictName(
      'test:my/thing/foo-conflict-1234.md',
    );
    expect(conflictName.includes('test:my/thing/foo-conflict-')).toBe(true);
    expect(conflictName).not.toBe('test:my/thing/foo-conflict-1234.md');
  });
});
