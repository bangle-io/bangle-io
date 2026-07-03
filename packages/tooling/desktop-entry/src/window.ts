import { join } from 'node:path';
import type { BrowserWindowConstructorOptions, WebContents } from 'electron';
import { DESKTOP_PLATFORM_ATTRIBUTE } from './desktop-document';

const DESKTOP_TITLEBAR_HEIGHT = 40;
const MACOS_TRAFFIC_LIGHT_SIZE = 14;
const MACOS_TRAFFIC_LIGHT_X = 14;

export interface ExternalLinkDecision {
  readonly action: 'allow-app-navigation' | 'open-external' | 'deny';
  readonly url: string;
}

const EXTERNAL_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);

export function getBrowserWindowOptions(
  preloadPath: string,
  platform = process.platform,
): BrowserWindowConstructorOptions {
  return {
    width: 1200,
    height: 820,
    minWidth: 900,
    minHeight: 640,
    title: 'Bangle.io',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      height: DESKTOP_TITLEBAR_HEIGHT,
    },
    ...(platform === 'darwin'
      ? ({
          trafficLightPosition: {
            x: MACOS_TRAFFIC_LIGHT_X,
            y: (DESKTOP_TITLEBAR_HEIGHT - MACOS_TRAFFIC_LIGHT_SIZE) / 2,
          },
        } satisfies Pick<
          BrowserWindowConstructorOptions,
          'trafficLightPosition'
        >)
      : {}),
    show: false,
    backgroundColor: '#ffffff',
    webPreferences: {
      preload: preloadPath,
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
  };
}

export function getPreloadPath(mainDir: string): string {
  return join(mainDir, 'preload.cjs');
}

export function decideNavigation(rawUrl: string): ExternalLinkDecision {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { action: 'deny', url: rawUrl };
  }

  if (url.protocol === 'bangle:' && url.hostname === 'app') {
    return { action: 'allow-app-navigation', url: rawUrl };
  }

  if (EXTERNAL_PROTOCOLS.has(url.protocol)) {
    return { action: 'open-external', url: rawUrl };
  }

  return { action: 'deny', url: rawUrl };
}

export function installExternalLinkHandlers(input: {
  readonly webContents: WebContents;
  readonly openExternal: (url: string) => Promise<unknown>;
}): void {
  input.webContents.setWindowOpenHandler(({ url }) => {
    const decision = decideNavigation(url);
    if (decision.action === 'open-external') {
      void input.openExternal(url);
    }
    return { action: 'deny' };
  });

  input.webContents.on('will-navigate', (event, url) => {
    const decision = decideNavigation(url);
    if (decision.action === 'allow-app-navigation') {
      return;
    }

    event.preventDefault();
    if (decision.action === 'open-external') {
      void input.openExternal(url);
    }
  });
}

export function createDesktopPlatformMarkerScript(platform: string): string {
  return `document.documentElement.setAttribute(${JSON.stringify(DESKTOP_PLATFORM_ATTRIBUTE)}, ${JSON.stringify(platform)});`;
}

export function installDesktopDocumentMarker(input: {
  readonly webContents: Pick<WebContents, 'executeJavaScript' | 'on'>;
  readonly platform?: string;
}): void {
  const markerScript = createDesktopPlatformMarkerScript(
    input.platform ?? process.platform,
  );

  input.webContents.on('dom-ready', () => {
    void input.webContents.executeJavaScript(markerScript, false).catch(() => {
      // A failed marker should not block app load; it only affects desktop chrome styling.
    });
  });
}
