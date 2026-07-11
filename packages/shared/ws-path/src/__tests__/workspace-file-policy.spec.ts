import { describe, expect, it } from 'vitest';
import {
  isIgnoredWorkspacePathSegment,
  isVisibleWorkspaceFilePath,
} from '../workspace-file-policy';

describe('workspace file visibility policy', () => {
  it.each([
    'garden:notes/index.md',
    'garden:.hidden.md',
    'garden:assets/report.pdf',
    'garden:src/component.tsx',
    'garden:archive/data.bin',
  ])('shows common non-hidden workspace file %s', (wsPath) => {
    expect(isVisibleWorkspaceFilePath(wsPath)).toBe(true);
  });

  it.each([
    'garden:notes/.draft.md',
    'garden:.archive/old.md',
    'garden:.git/hooks/post-commit.md',
    'garden:temp/legacy.md',
    'garden:.obsidian/workspace.json',
    'garden:node_modules/pkg/index.ts',
    'garden:node_modules/pkg/README.md',
    'garden:dist/bundle.js',
    'garden:coverage/report.json',
    'garden:assets/Thumbs.db',
  ])('hides ignored workspace file %s', (wsPath) => {
    expect(isVisibleWorkspaceFilePath(wsPath)).toBe(false);
  });

  it('rejects non-file wsPaths', () => {
    expect(isVisibleWorkspaceFilePath('garden:notes/')).toBe(false);
    expect(isVisibleWorkspaceFilePath('not a wsPath')).toBe(false);
  });

  it.each([
    '.git',
    'node_modules',
    'dist',
    'coverage',
    '__pycache__',
  ])('identifies ignored path segment %s', (segment) => {
    expect(isIgnoredWorkspacePathSegment(segment)).toBe(true);
  });

  it('matches ASCII ignore lists without locale-sensitive lowercasing', () => {
    expect(isIgnoredWorkspacePathSegment('DIST')).toBe(true);
    expect(isVisibleWorkspaceFilePath('garden:assets/THUMBS.DB')).toBe(false);
  });
});

describe('transient swap/temp files', () => {
  it.each([
    'ws:note.md.crswap',
    'ws:docs/other.MD.CRSWAP',
    'ws:draft.tmp',
    'ws:notes/file.swp',
  ])('hides %s from workspace listings and watchers', (wsPath) => {
    expect(isVisibleWorkspaceFilePath(wsPath)).toBe(false);
  });

  it('still shows regular notes and assets', () => {
    expect(isVisibleWorkspaceFilePath('ws:note.md')).toBe(true);
    expect(isVisibleWorkspaceFilePath('ws:image.png')).toBe(true);
  });
});
