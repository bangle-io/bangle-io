// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

type PwaInstallModule = typeof import('../pwa-install');

let pwaInstall: PwaInstallModule;

type TestWindowControlsOverlayGeometryChangeEvent = Event & {
  titlebarAreaRect?: Pick<DOMRectReadOnly, 'height' | 'width' | 'x' | 'y'>;
};

function makeInstallPromptEvent(
  outcome: 'accepted' | 'dismissed' = 'accepted',
) {
  const event = new Event('beforeinstallprompt', {
    cancelable: true,
  }) as Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
  };

  event.prompt = vi.fn(() => Promise.resolve());
  event.userChoice = Promise.resolve({ outcome });

  return event;
}

beforeEach(async () => {
  vi.resetModules();
  document.documentElement.removeAttribute(
    'data-bangle-window-controls-overlay',
  );
  document.documentElement.removeAttribute(
    'data-bangle-window-controls-overlay-controls',
  );
  document.documentElement.removeAttribute('style');
  Object.defineProperty(document.documentElement, 'clientWidth', {
    configurable: true,
    value: 0,
  });
  pwaInstall = await import('../pwa-install');
});

describe('PWA install prompt tracking', () => {
  it('captures the browser install prompt and exposes install availability', () => {
    pwaInstall.initializePwaInstallPromptTracking(window);
    const listener = vi.fn();
    const unsubscribe = pwaInstall.subscribePwaInstallPrompt(listener);
    const event = makeInstallPromptEvent();

    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(listener).toHaveBeenCalled();
    expect(pwaInstall.getPwaInstallSnapshot()).toMatchObject({
      canInstall: true,
      isInstalled: false,
    });

    unsubscribe();
  });

  it('prompts once and clears the deferred prompt after user choice', async () => {
    pwaInstall.initializePwaInstallPromptTracking(window);
    const event = makeInstallPromptEvent('dismissed');

    window.dispatchEvent(event);
    await expect(pwaInstall.promptPwaInstall()).resolves.toBe('dismissed');

    expect(event.prompt).toHaveBeenCalledTimes(1);
    expect(pwaInstall.getPwaInstallSnapshot().canInstall).toBe(false);
  });

  it('hides install availability after appinstalled fires', () => {
    pwaInstall.initializePwaInstallPromptTracking(window);
    window.dispatchEvent(makeInstallPromptEvent());

    window.dispatchEvent(new Event('appinstalled'));

    expect(pwaInstall.getPwaInstallSnapshot()).toMatchObject({
      canInstall: false,
      isInstalled: true,
    });
  });
});

describe('app document title', () => {
  it('sets the browser title and PWA subtitle when the document supports it', () => {
    const documentRef = {
      title: '',
      subtitle: '',
    } as Document & { subtitle: string };

    pwaInstall.syncAppDocumentTitle(documentRef);

    expect(documentRef.title).toBe('Bangle.io');
    expect(documentRef.subtitle).toBe('Notes');
  });
});

describe('window controls overlay', () => {
  it('marks the document when the installed PWA titlebar overlay is visible', () => {
    const windowControlsOverlay = new EventTarget() as EventTarget & {
      getTitlebarAreaRect: () => Pick<
        DOMRectReadOnly,
        'height' | 'width' | 'x' | 'y'
      >;
      visible: boolean;
    };
    windowControlsOverlay.visible = true;
    windowControlsOverlay.getTitlebarAreaRect = () => ({
      height: 32,
      width: 900,
      x: 0,
      y: 0,
    });

    pwaInstall.syncWindowControlsOverlayState({
      documentRef: document,
      navigatorRef: {
        windowControlsOverlay,
      },
    });

    expect(
      document.documentElement.getAttribute(
        'data-bangle-window-controls-overlay',
      ),
    ).toBe('visible');
    expect(
      document.documentElement.getAttribute(
        'data-bangle-window-controls-overlay-controls',
      ),
    ).toBe('right');
    expect(
      document.documentElement.style.getPropertyValue(
        '--bangle-titlebar-area-width',
      ),
    ).toBe('900px');
  });

  it('updates the document marker when the titlebar overlay visibility changes', () => {
    const windowControlsOverlay = new EventTarget() as EventTarget & {
      visible: boolean;
    };
    windowControlsOverlay.visible = true;

    pwaInstall.syncWindowControlsOverlayState({
      documentRef: document,
      navigatorRef: {
        windowControlsOverlay,
      },
    });

    windowControlsOverlay.visible = false;
    windowControlsOverlay.dispatchEvent(new Event('geometrychange'));

    expect(
      document.documentElement.getAttribute(
        'data-bangle-window-controls-overlay',
      ),
    ).toBe('hidden');
  });

  it('captures updated titlebar geometry from geometrychange events', () => {
    const windowControlsOverlay = new EventTarget() as EventTarget & {
      visible: boolean;
    };
    windowControlsOverlay.visible = true;

    pwaInstall.syncWindowControlsOverlayState({
      documentRef: document,
      navigatorRef: {
        windowControlsOverlay,
      },
    });

    const geometryChangeEvent = new Event(
      'geometrychange',
    ) as TestWindowControlsOverlayGeometryChangeEvent;
    geometryChangeEvent.titlebarAreaRect = {
      height: 40,
      width: 760,
      x: 88,
      y: 0,
    };

    windowControlsOverlay.dispatchEvent(geometryChangeEvent);

    expect(
      document.documentElement.getAttribute(
        'data-bangle-window-controls-overlay-controls',
      ),
    ).toBe('left');
    expect(
      document.documentElement.style.getPropertyValue(
        '--bangle-titlebar-area-x',
      ),
    ).toBe('88px');
    expect(
      document.documentElement.style.getPropertyValue(
        '--bangle-titlebar-area-height',
      ),
    ).toBe('40px');
  });

  it('marks both control edges when the titlebar area leaves left and right regions unavailable', () => {
    Object.defineProperty(document.documentElement, 'clientWidth', {
      configurable: true,
      value: 1000,
    });
    const windowControlsOverlay = new EventTarget() as EventTarget & {
      getTitlebarAreaRect: () => Pick<
        DOMRectReadOnly,
        'height' | 'width' | 'x' | 'y'
      >;
      visible: boolean;
    };
    windowControlsOverlay.visible = true;
    windowControlsOverlay.getTitlebarAreaRect = () => ({
      height: 40,
      width: 760,
      x: 88,
      y: 0,
    });

    pwaInstall.syncWindowControlsOverlayState({
      documentRef: document,
      navigatorRef: {
        windowControlsOverlay,
      },
    });

    expect(
      document.documentElement.getAttribute(
        'data-bangle-window-controls-overlay-controls',
      ),
    ).toBe('both');
    expect(
      document.documentElement.style.getPropertyValue(
        '--bangle-titlebar-area-width',
      ),
    ).toBe('760px');
  });
});
