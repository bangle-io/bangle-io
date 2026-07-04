import { createReadStream } from 'node:fs';
import { access } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { Readable } from 'node:stream';
import { pathToFileURL } from 'node:url';
import {
  APP_PROTOCOL,
  APP_URL,
  getContentType,
  resolveProtocolFilePath,
  shouldServeIndexFallback,
} from './protocol';

interface ProtocolRequest {
  readonly url: string;
}

interface ProtocolRegistrar {
  handle(
    scheme: string,
    handler: (request: ProtocolRequest) => Promise<Response>,
  ): void;
}

interface NetFetch {
  fetch(url: string): Promise<Response>;
}

interface Logger {
  warn(message?: unknown, ...optionalParams: unknown[]): void;
}

let registeredBrowserDistDir: string | undefined;

export function resetAppProtocolRegistrationForTests(): void {
  registeredBrowserDistDir = undefined;
}

export function registerAppProtocol(input: {
  readonly browserDistDir: string;
  readonly net: NetFetch;
  readonly protocol: ProtocolRegistrar;
  readonly logger?: Logger;
}): boolean {
  const browserDistDir = resolve(input.browserDistDir);

  if (registeredBrowserDistDir) {
    if (registeredBrowserDistDir !== browserDistDir) {
      throw new Error(
        `Desktop app protocol is already registered for ${registeredBrowserDistDir}, cannot re-register for ${browserDistDir}`,
      );
    }
    return false;
  }

  input.protocol.handle(
    APP_PROTOCOL,
    createAppProtocolRequestHandler({
      browserDistDir,
      net: input.net,
      logger: input.logger,
    }),
  );
  registeredBrowserDistDir = browserDistDir;
  return true;
}

function createAppProtocolRequestHandler(input: {
  readonly browserDistDir: string;
  readonly net: NetFetch;
  readonly logger?: Logger;
}): (request: ProtocolRequest) => Promise<Response> {
  const browserDistDir = resolve(input.browserDistDir);

  return async (request) => {
    let filePath: string;

    try {
      filePath = resolveProtocolFilePath({
        rootDir: browserDistDir,
        requestUrl: request.url,
      });
    } catch (error) {
      input.logger?.warn('[desktop-protocol] Rejected app protocol request.', {
        url: request.url,
        error,
      });
      return new Response('Not found', { status: 404 });
    }

    try {
      await access(filePath);
    } catch (error) {
      if (shouldServeIndexFallback(request.url)) {
        filePath = join(browserDistDir, 'index.html');
      } else {
        input.logger?.warn('[desktop-protocol] Browser asset not found.', {
          url: request.url,
          error,
        });

        return new Response('Not found', { status: 404 });
      }
    }

    try {
      return new Response(Readable.toWeb(createReadStream(filePath)), {
        headers: {
          'content-type': getContentType(filePath),
        },
      });
    } catch (error) {
      input.logger?.warn(
        '[desktop-protocol] Falling back to Electron net fetch.',
        {
          url: request.url,
          error,
        },
      );

      if (request.url === APP_URL) {
        return input.net.fetch(
          pathToFileURL(join(browserDistDir, 'index.html')).href,
        );
      }

      return new Response('Not found', { status: 404 });
    }
  };
}
