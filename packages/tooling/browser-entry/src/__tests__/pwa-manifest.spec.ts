import { describe, expect, it } from 'vitest';
import {
  getPwaManifestBuildOrigin,
  getPwaManifestSource,
} from '../../pwa-manifest';

describe('PWA manifest generation', () => {
  it('uses an absolute self ID for a preview deployment', () => {
    const manifest = JSON.parse(
      getPwaManifestSource('https://pr-657.example.pages.dev/build'),
    ) as {
      id: string;
      related_applications: Array<{
        id: string;
        platform: string;
        url: string;
      }>;
    };

    expect(manifest.id).toBe('/');
    expect(manifest.related_applications).toEqual([
      {
        platform: 'webapp',
        url: 'https://pr-657.example.pages.dev/manifest.webmanifest',
        id: 'https://pr-657.example.pages.dev/',
      },
      {
        platform: 'webapp',
        url: 'https://app.bangle.io/manifest.webmanifest',
        id: 'https://app.bangle.io/',
      },
    ]);
  });

  it('does not duplicate the production self entry', () => {
    const manifest = JSON.parse(
      getPwaManifestSource('https://app.bangle.io/'),
    ) as { related_applications: unknown[] };

    expect(manifest.related_applications).toHaveLength(1);
  });

  it('uses the canonical origin for production and the deployment URL elsewhere', () => {
    expect(
      getPwaManifestBuildOrigin({
        appEnv: 'production',
        cloudflarePagesUrl: 'https://production-build.pages.dev',
      }),
    ).toBe('https://app.bangle.io');
    expect(
      getPwaManifestBuildOrigin({
        appEnv: 'dev/pwa-preview',
        cloudflarePagesUrl: 'https://pr-657.example.pages.dev/some-path',
      }),
    ).toBe('https://pr-657.example.pages.dev');
  });
});
