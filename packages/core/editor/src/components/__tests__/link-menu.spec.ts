import { describe, expect, it } from 'vitest';
import { isValidHttpUrl, normalizeHttpUrl } from '../link-menu';

describe('normalizeHttpUrl', () => {
  it('defaults bare web addresses and host ports to HTTPS', () => {
    expect(normalizeHttpUrl('google.com')).toBe('https://google.com/');
    expect(normalizeHttpUrl('xkcd')).toBe('https://xkcd/');
    expect(normalizeHttpUrl(' example.com/docs ')).toBe(
      'https://example.com/docs',
    );
    expect(normalizeHttpUrl('localhost:5173')).toBe('https://localhost:5173/');
  });

  it('preserves explicit HTTP and HTTPS addresses', () => {
    expect(normalizeHttpUrl('http://example.com')).toBe('http://example.com/');
    expect(normalizeHttpUrl('https://example.com/path')).toBe(
      'https://example.com/path',
    );
  });

  it('rejects empty, malformed, and non-HTTP schemes', () => {
    expect(normalizeHttpUrl('')).toBeUndefined();
    expect(normalizeHttpUrl('google com')).toBeUndefined();
    expect(normalizeHttpUrl('google%20com')).toBeUndefined();
    expect(normalizeHttpUrl('javascript:alert(1)')).toBeUndefined();
    expect(normalizeHttpUrl('mailto:user@example.com')).toBeUndefined();
    expect(isValidHttpUrl('javascript:alert(1)')).toBe(false);
  });
});
