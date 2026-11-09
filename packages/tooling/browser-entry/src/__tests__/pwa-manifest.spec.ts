import { describe, expect, it } from 'vitest';
import {
  getPwaManifestBuildOrigin,
  getPwaManifestSource,
  getRequestOrigin,
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
        isCloudflarePagesBuild: true,
      }),
    ).toBe('https://app.bangle.io');
    expect(
      getPwaManifestBuildOrigin({
        appEnv: 'dev/pwa-preview',
        cloudflarePagesUrl: 'https://pr-657.example.pages.dev/some-path',
        isCloudflarePagesBuild: true,
      }),
    ).toBe('https://pr-657.example.pages.dev');
  });

  it('emits only the production entry for a local build with no deployment origin', () => {
    expect(
      getPwaManifestBuildOrigin({
        appEnv: 'staging',
        cloudflarePagesUrl: undefined,
        isCloudflarePagesBuild: false,
      }),
    ).toBeUndefined();

    const manifest = JSON.parse(getPwaManifestSource(undefined)) as {
      related_applications: Array<{ id: string }>;
    };
    expect(manifest.related_applications).toEqual([
      {
        platform: 'webapp',
        url: 'https://app.bangle.io/manifest.webmanifest',
        id: 'https://app.bangle.io/',
      },
    ]);
  });

  it('fails a non-production Cloudflare Pages build that is missing its origin', () => {
    expect(() =>
      getPwaManifestBuildOrigin({
        appEnv: 'staging',
        cloudflarePagesUrl: undefined,
        isCloudflarePagesBuild: true,
      }),
    ).toThrow(/CF_PAGES_URL/);
  });

  it('rejects non-http deployment origins', () => {
    expect(() =>
      getPwaManifestBuildOrigin({
        appEnv: 'staging',
        cloudflarePagesUrl: 'ftp://example.com',
        isCloudflarePagesBuild: true,
      }),
    ).toThrow(/protocol/);
  });

  it('keeps explicit ports in http dev origins', () => {
    const manifest = JSON.parse(
      getPwaManifestSource('http://localhost:5173'),
    ) as { related_applications: Array<{ id: string }> };

    expect(manifest.related_applications[0]?.id).toBe('http://localhost:5173/');
  });
});

describe('request origin resolution', () => {
  it('derives the origin from Host and defaults to http', () => {
    expect(
      getRequestOrigin({ host: 'localhost:5173', forwardedProto: undefined }),
    ).toBe('http://localhost:5173');
  });

  it('prefers the forwarded host and first forwarded protocol', () => {
    expect(
      getRequestOrigin({
        host: 'internal:8080',
        forwardedHost: 'app.example.com, cdn.example.com',
        forwardedProto: ['HTTPS', 'http'],
      }),
    ).toBe('https://app.example.com');
  });

  it('returns undefined without any host', () => {
    expect(
      getRequestOrigin({ host: undefined, forwardedProto: 'https' }),
    ).toBeUndefined();
  });
});
