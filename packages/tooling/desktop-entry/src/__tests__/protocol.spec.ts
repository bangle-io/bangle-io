import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  APP_URL,
  DesktopProtocolPathError,
  getContentType,
  resolveProtocolFilePath,
  shouldServeIndexFallback,
} from '../protocol';

describe('desktop custom protocol', () => {
  const rootDir = resolve('/tmp/bangle-browser-dist');

  it('resolves the app root to index.html', () => {
    expect(resolveProtocolFilePath({ rootDir, requestUrl: APP_URL })).toBe(
      resolve(rootDir, 'index.html'),
    );
  });

  it('resolves nested assets inside the browser dist directory', () => {
    expect(
      resolveProtocolFilePath({
        rootDir,
        requestUrl: 'bangle://app/assets/index-abc123.js',
      }),
    ).toBe(resolve(rootDir, 'assets/index-abc123.js'));
  });

  it('rejects traversal even when it is URL-encoded', () => {
    expect(() =>
      resolveProtocolFilePath({
        rootDir,
        requestUrl: 'bangle://app/%2e%2e/secret.md',
      }),
    ).toThrow(DesktopProtocolPathError);
  });

  it('rejects unsupported hosts and protocols', () => {
    expect(() =>
      resolveProtocolFilePath({
        rootDir,
        requestUrl: 'bangle://settings/index.html',
      }),
    ).toThrow(DesktopProtocolPathError);
    expect(() =>
      resolveProtocolFilePath({
        rootDir,
        requestUrl: 'file:///tmp/bangle-browser-dist/index.html',
      }),
    ).toThrow(DesktopProtocolPathError);
  });

  it('returns content types for common Vite assets', () => {
    expect(getContentType('/tmp/index.html')).toBe('text/html; charset=utf-8');
    expect(getContentType('/tmp/assets/index.js')).toBe(
      'text/javascript; charset=utf-8',
    );
    expect(getContentType('/tmp/assets/logo.svg')).toBe('image/svg+xml');
  });

  it('falls back to index.html for SPA routes, not missing assets', () => {
    expect(shouldServeIndexFallback('bangle://app/ws#route=editor')).toBe(true);
    expect(shouldServeIndexFallback('bangle://app/settings')).toBe(true);
    expect(shouldServeIndexFallback('bangle://app/assets/missing.js')).toBe(
      false,
    );
    expect(shouldServeIndexFallback('https://bangle.io/ws')).toBe(false);
  });
});
