import { describe, expect, it, vi } from 'vitest';
import {
  createDesktopPlatformMarkerScript,
  decideNavigation,
  getBrowserWindowOptions,
  installDesktopDocumentMarker,
  installExternalLinkHandlers,
} from '../window';

describe('desktop BrowserWindow defaults', () => {
  it('locks down renderer privileges', () => {
    const options = getBrowserWindowOptions('/tmp/preload.cjs');

    expect(options.webPreferences).toMatchObject({
      preload: '/tmp/preload.cjs',
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    });
  });

  it('uses a clean hidden inset macOS title bar', () => {
    const options = getBrowserWindowOptions('/tmp/preload.cjs', 'darwin');

    expect(options).toMatchObject({
      titleBarStyle: 'hiddenInset',
      trafficLightPosition: { x: 14, y: 18 },
    });
  });

  it('keeps the native frame on non-macOS platforms', () => {
    const options = getBrowserWindowOptions('/tmp/preload.cjs', 'linux');

    expect(options.titleBarStyle).toBeUndefined();
    expect(options.trafficLightPosition).toBeUndefined();
  });
});

describe('desktop external link handling', () => {
  it('allows custom-origin app navigation', () => {
    expect(decideNavigation('bangle://app/#route=home')).toEqual({
      action: 'allow-app-navigation',
      url: 'bangle://app/#route=home',
    });
  });

  it('opens http, https, and mailto URLs externally', () => {
    expect(decideNavigation('https://example.com/docs').action).toBe(
      'open-external',
    );
    expect(decideNavigation('http://example.com/docs').action).toBe(
      'open-external',
    );
    expect(decideNavigation('mailto:test@example.com').action).toBe(
      'open-external',
    );
  });

  it('denies file and malformed URLs', () => {
    expect(decideNavigation('file:///etc/passwd').action).toBe('deny');
    expect(decideNavigation('not a url').action).toBe('deny');
  });

  it('opens new external windows through shell.openExternal and denies Electron windows', () => {
    const openExternal = vi.fn(() => Promise.resolve());
    let windowOpenHandler:
      | ((details: { readonly url: string }) => { readonly action: 'deny' })
      | undefined;
    const webContents = {
      setWindowOpenHandler: vi.fn((handler) => {
        windowOpenHandler = handler;
      }),
      on: vi.fn(),
    };

    installExternalLinkHandlers({
      webContents: webContents as never,
      openExternal,
    });

    expect(windowOpenHandler?.({ url: 'https://example.com' })).toEqual({
      action: 'deny',
    });
    expect(openExternal).toHaveBeenCalledWith('https://example.com');
  });

  it('prevents top-level external navigation and opens safe protocols externally', () => {
    const openExternal = vi.fn(() => Promise.resolve());
    let willNavigate:
      | ((event: { preventDefault: () => void }, url: string) => void)
      | undefined;
    const webContents = {
      setWindowOpenHandler: vi.fn(),
      on: vi.fn((eventName, handler) => {
        if (eventName === 'will-navigate') {
          willNavigate = handler;
        }
      }),
    };
    const event = { preventDefault: vi.fn() };

    installExternalLinkHandlers({
      webContents: webContents as never,
      openExternal,
    });
    willNavigate?.(event, 'https://example.com');

    expect(event.preventDefault).toHaveBeenCalled();
    expect(openExternal).toHaveBeenCalledWith('https://example.com');
  });
});

describe('desktop renderer document marker', () => {
  it('builds a safe platform marker script', () => {
    expect(createDesktopPlatformMarkerScript('darwin')).toBe(
      'document.documentElement.setAttribute("data-bangle-desktop-platform", "darwin");',
    );
  });

  it('marks each renderer document when the DOM is ready', async () => {
    let domReadyHandler: (() => void) | undefined;
    const webContents = {
      executeJavaScript: vi.fn(() => Promise.resolve()),
      on: vi.fn((eventName, handler) => {
        if (eventName === 'dom-ready') {
          domReadyHandler = handler;
        }
      }),
    };

    installDesktopDocumentMarker({
      webContents: webContents as never,
      platform: 'darwin',
    });
    domReadyHandler?.();
    await Promise.resolve();

    expect(webContents.executeJavaScript).toHaveBeenCalledWith(
      'document.documentElement.setAttribute("data-bangle-desktop-platform", "darwin");',
      false,
    );
  });
});
