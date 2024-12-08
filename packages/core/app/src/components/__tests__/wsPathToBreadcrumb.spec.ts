import { describe, expect, it } from 'vitest';
import {
  getVisibleSegments,
  shouldShowEllipsis,
  wsPathToBreadcrumb,
} from '../NoteBreadcrumb';

describe('wsPathToBreadcrumb', () => {
  it('handles root workspace path', () => {
    const result = wsPathToBreadcrumb('my-workspace:');
    expect(result).toEqual([
      { label: 'my-workspace', wsPath: 'my-workspace:' },
    ]);
  });

  it('handles simple file path', () => {
    const result = wsPathToBreadcrumb('my-workspace:note.md');
    expect(result).toEqual([
      { label: 'my-workspace', wsPath: 'my-workspace:' },
      { label: 'note.md', wsPath: 'my-workspace:note.md' },
    ]);
  });

  it('handles nested file path', () => {
    const result = wsPathToBreadcrumb('my-workspace:folder/subfolder/note.md');
    expect(result).toEqual([
      { label: 'my-workspace', wsPath: 'my-workspace:' },
      { label: 'folder', wsPath: 'my-workspace:folder' },
      { label: 'subfolder', wsPath: 'my-workspace:folder/subfolder' },
      { label: 'note.md', wsPath: 'my-workspace:folder/subfolder/note.md' },
    ]);
  });
});

describe('shouldShowEllipsis', () => {
  it('returns false for short paths', () => {
    const segments = wsPathToBreadcrumb('workspace:folder/note.md');
    expect(shouldShowEllipsis(segments)).toBe(false);
  });

  it('returns true for long paths', () => {
    const segments = wsPathToBreadcrumb('workspace:one/two/three/four/five.md');
    expect(shouldShowEllipsis(segments)).toBe(true);
  });
});

describe('getVisibleSegments', () => {
  it('returns all segments for short paths', () => {
    const segments = wsPathToBreadcrumb('workspace:folder/note.md');
    expect(getVisibleSegments(segments)).toEqual(segments);
  });

  it('returns truncated segments for long paths', () => {
    const segments = wsPathToBreadcrumb('workspace:one/two/three/four/five.md');
    const visible = getVisibleSegments(segments);
    expect(visible).toHaveLength(3);
    expect(visible[0]?.label).toBe('workspace');
    expect(visible[1]?.label).toBe('four');
    expect(visible[2]?.label).toBe('five.md');
  });
});
