import { describe, expect, it } from 'vitest';
import {
  getVisibleSegments,
  shouldShowEllipsis,
  wsPathToBreadcrumb,
} from '../navigation/utils';

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
      { label: 'folder', wsPath: 'my-workspace:folder/' },
      { label: 'subfolder', wsPath: 'my-workspace:folder/subfolder/' },
      { label: 'note.md', wsPath: 'my-workspace:folder/subfolder/note.md' },
    ]);
  });
});

describe('shouldShowEllipsis', () => {
  it('returns false for short paths (<= 4 segments)', () => {
    const segments = wsPathToBreadcrumb('workspace:folder/note.md'); // 3 segments
    expect(shouldShowEllipsis(segments)).toBe(false);
    const segments2 = wsPathToBreadcrumb('workspace:folder/sub/note.md'); // 4 segments
    expect(shouldShowEllipsis(segments2)).toBe(false);
  });

  it('returns true for long paths (> 4 segments)', () => {
    const segments = wsPathToBreadcrumb('workspace:one/two/three/note.md'); // 5 segments
    expect(shouldShowEllipsis(segments)).toBe(true);
  });
});

describe('getVisibleSegments', () => {
  it('returns all segments for short paths', () => {
    const segments = wsPathToBreadcrumb('workspace:folder/note.md');
    expect(getVisibleSegments(segments)).toEqual(segments);
    const segments2 = wsPathToBreadcrumb('workspace:folder/sub/note.md');
    expect(getVisibleSegments(segments2)).toEqual(segments2);
  });

  it('returns truncated segments (first, last two) for long paths', () => {
    const segments = wsPathToBreadcrumb('workspace:one/two/three/four/five.md'); // 6 segments
    const visible = getVisibleSegments(segments);
    expect(visible).toHaveLength(3);
    expect(visible[0]?.label).toBe('workspace');
    expect(visible[1]?.label).toBe('four'); // second to last
    expect(visible[2]?.label).toBe('five.md'); // last
  });

  it('handles edge case of exactly 5 segments', () => {
    const segments = wsPathToBreadcrumb('workspace:one/two/three/four.md'); // 5 segments
    const visible = getVisibleSegments(segments);
    expect(visible).toHaveLength(3);
    expect(visible[0]?.label).toBe('workspace');
    expect(visible[1]?.label).toBe('three'); // second to last
    expect(visible[2]?.label).toBe('four.md'); // last
  });
});
