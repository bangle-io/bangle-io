import { describe, expect, it } from 'vitest';
import {
  resolveDesktopReleaseMetadata,
  resolveNextStableVersion,
  resolveNightlyVersion,
  resolveProductName,
  resolveUpdateChannel,
  validateStableTag,
} from '../release-metadata';

describe('desktop release metadata', () => {
  it('derives the nightly version from the next stable patch', () => {
    expect(
      resolveNightlyVersion({
        rootVersion: '1.2.3',
        date: '20260701',
        runNumber: 17,
      }),
    ).toBe('1.2.4-nightly.20260701.17');
  });

  it('strips prerelease metadata before deriving the next stable version', () => {
    expect(resolveNextStableVersion('2.4.9-alpha.1')).toBe('2.4.10');
    expect(resolveNextStableVersion('2.4.9+build.5')).toBe('2.4.10');
  });

  it('derives update channel from release version', () => {
    expect(resolveUpdateChannel('1.2.3')).toBe('latest');
    expect(resolveUpdateChannel('1.2.4-nightly.20260701.17')).toBe('nightly');
  });

  it('uses release-channel product names', () => {
    expect(resolveProductName('latest')).toBe('Bangle.io');
    expect(resolveProductName('nightly')).toBe('Bangle.io Nightly');
  });

  it('resolves GitHub Release metadata for stable and nightly builds', () => {
    expect(resolveDesktopReleaseMetadata('1.2.3')).toMatchObject({
      channel: 'latest',
      tag: 'v1.2.3',
      prerelease: false,
      makeLatest: true,
      productName: 'Bangle.io',
    });
    expect(
      resolveDesktopReleaseMetadata('1.2.4-nightly.20260701.17'),
    ).toMatchObject({
      channel: 'nightly',
      tag: 'v1.2.4-nightly.20260701.17',
      prerelease: true,
      makeLatest: false,
      productName: 'Bangle.io Nightly',
    });
  });

  it('validates stable release tags against the package version', () => {
    expect(validateStableTag({ tag: 'v1.2.3', packageVersion: '1.2.3' })).toBe(
      '1.2.3',
    );
    expect(() =>
      validateStableTag({ tag: 'v1.2.4', packageVersion: '1.2.3' }),
    ).toThrow(/does not match/);
    expect(() =>
      validateStableTag({
        tag: 'v1.2.4-nightly.20260701.17',
        packageVersion: '1.2.4-nightly.20260701.17',
      }),
    ).toThrow(/vX\.Y\.Z/);
  });
});
