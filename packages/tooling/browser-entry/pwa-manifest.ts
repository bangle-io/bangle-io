import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Connect, Plugin } from 'vite';

const MANIFEST_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'pwa-manifest.template.json',
);
const MANIFEST_REQUEST_PATH = '/manifest.webmanifest';
const PRODUCTION_ORIGIN = 'https://app.bangle.io';

type RelatedApplication = {
  platform: string;
  url: string;
  id: string;
};

type PwaManifest = {
  related_applications?: RelatedApplication[];
} & Record<string, unknown>;

function readManifest(): PwaManifest {
  return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')) as PwaManifest;
}

function normalizeOrigin(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const url = new URL(value);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(
      `Unsupported PWA manifest origin protocol: ${url.protocol}`,
    );
  }

  return url.origin;
}

/**
 * Desktop Chromium requires a `webapp` related application ID to be an
 * absolute manifest ID. Relative IDs such as `/` are parsed as invalid URLs
 * and silently skipped by `getInstalledRelatedApps()`.
 */
export function getPwaManifestSource(origin: string | undefined): string {
  const manifest = readManifest();
  const resolvedOrigin = normalizeOrigin(origin);
  const relatedOrigins = [resolvedOrigin, PRODUCTION_ORIGIN].filter(
    (candidate, index, values): candidate is string =>
      Boolean(candidate) && values.indexOf(candidate) === index,
  );

  manifest.related_applications = relatedOrigins.map((relatedOrigin) => ({
    platform: 'webapp',
    url: `${relatedOrigin}${MANIFEST_REQUEST_PATH}`,
    id: `${relatedOrigin}/`,
  }));

  return `${JSON.stringify(manifest, null, 2)}\n`;
}

export function getPwaManifestBuildOrigin(input: {
  appEnv: string;
  cloudflarePagesUrl: string | undefined;
  isCloudflarePagesBuild: boolean;
}): string | undefined {
  if (input.appEnv === 'production') {
    return PRODUCTION_ORIGIN;
  }

  const origin = normalizeOrigin(input.cloudflarePagesUrl);
  if (input.isCloudflarePagesBuild && !origin) {
    // A deployment built without its origin would silently emit a
    // production-only manifest and defeat self-detection on that origin.
    throw new Error(
      'CF_PAGES_URL must be set for non-production Cloudflare Pages builds.',
    );
  }

  return origin;
}

function firstHeaderValue(
  value: string | string[] | undefined,
): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  const first = raw?.split(',')[0]?.trim();
  return first || undefined;
}

export function getRequestOrigin(input: {
  host: string | undefined;
  forwardedHost?: string | string[] | undefined;
  forwardedProto: string | string[] | undefined;
}): string | undefined {
  const host = firstHeaderValue(input.forwardedHost) ?? input.host;
  if (!host) {
    return undefined;
  }

  const protocol =
    firstHeaderValue(input.forwardedProto)?.toLowerCase() === 'https'
      ? 'https'
      : 'http';
  return `${protocol}://${host}`;
}

/** Emits the deployment-specific manifest and serves a port-specific one locally. */
export function pwaManifestPlugin(buildOrigin: string | undefined): Plugin {
  const serveManifest = (middlewares: Connect.Server) => {
    middlewares.use((req, res, next) => {
      const requestPath = req.url?.split('?')[0];
      if (requestPath !== MANIFEST_REQUEST_PATH) {
        next();
        return;
      }

      const requestOrigin = getRequestOrigin({
        host: req.headers.host,
        forwardedHost: req.headers['x-forwarded-host'],
        forwardedProto: req.headers['x-forwarded-proto'],
      });
      res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
      // The body varies with request headers; never let a proxy cache it.
      res.setHeader('Cache-Control', 'no-store');

      let source: string;
      try {
        source = getPwaManifestSource(requestOrigin);
      } catch {
        // A malformed authority must not take the endpoint down; fall back
        // to the origin-less (production-only) manifest.
        source = getPwaManifestSource(undefined);
      }
      res.end(source);
    });
  };

  return {
    name: 'bangle-pwa-manifest',
    configureServer(server) {
      serveManifest(server.middlewares);
    },
    configurePreviewServer(server) {
      serveManifest(server.middlewares);
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: MANIFEST_REQUEST_PATH.slice(1),
        source: getPwaManifestSource(buildOrigin),
      });
    },
  };
}
