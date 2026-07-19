// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
      canOpenInApp: true,
      // Same-session installs are flagged so the open-in-app prompt stays
      // quiet while Chrome auto-opens the freshly installed app.
      installedThisSession: true,
    });
  });
});

describe('installed related apps detection', () => {
  afterEach(() => {
    Reflect.deleteProperty(window.navigator, 'getInstalledRelatedApps');
  });

  function stubInstalledRelatedApps(
    apps: Array<{ platform: string; url?: string }>,
  ) {
    Object.defineProperty(window.navigator, 'getInstalledRelatedApps', {
      configurable: true,
      value: vi.fn(() => Promise.resolve(apps)),
    });
  }

  function selfManifestUrl() {
    return `${window.location.origin}/manifest.webmanifest`;
  }

  it('reports open-in-app availability when the browser says the PWA is installed', async () => {
    stubInstalledRelatedApps([{ platform: 'webapp', url: selfManifestUrl() }]);

    pwaInstall.initializePwaInstallPromptTracking(window);

    await vi.waitFor(() => {
      expect(pwaInstall.getPwaInstallSnapshot()).toMatchObject({
        isInstalled: true,
        canOpenInApp: true,
        isStandalone: false,
        installedThisSession: false,
      });
    });

    // A deferred install prompt arriving afterwards must not re-offer install.
    window.dispatchEvent(makeInstallPromptEvent());
    expect(pwaInstall.getPwaInstallSnapshot().canInstall).toBe(false);
  });

  it('keeps the app uninstalled when no related apps are reported', async () => {
    stubInstalledRelatedApps([]);

    pwaInstall.initializePwaInstallPromptTracking(window);
    await Promise.resolve();

    expect(pwaInstall.getPwaInstallSnapshot()).toMatchObject({
      isInstalled: false,
      canOpenInApp: false,
    });
  });

  it('ignores related apps that are not the web app itself', async () => {
    stubInstalledRelatedApps([{ platform: 'windows' }]);

    pwaInstall.initializePwaInstallPromptTracking(window);
    await Promise.resolve();

    expect(pwaInstall.getPwaInstallSnapshot().canOpenInApp).toBe(false);
  });

  it('ignores an installed web app from a different origin', async () => {
    // The manifest lists the production app as a related application on
    // non-production origins; a production install must not surface
    // open-in-app on this (different-origin) deployment.
    stubInstalledRelatedApps([
      { platform: 'webapp', url: 'https://app.bangle.io/manifest.webmanifest' },
      { platform: 'webapp' },
    ]);

    pwaInstall.initializePwaInstallPromptTracking(window);
    await Promise.resolve();

    expect(pwaInstall.getPwaInstallSnapshot().canOpenInApp).toBe(false);
  });

  it('treats a rejected related-apps probe as not installed', async () => {
    Object.defineProperty(window.navigator, 'getInstalledRelatedApps', {
      configurable: true,
      value: vi.fn(() => Promise.reject(new Error('denied'))),
    });

    pwaInstall.initializePwaInstallPromptTracking(window);
    await Promise.resolve();
    await Promise.resolve();

    expect(pwaInstall.getPwaInstallSnapshot()).toMatchObject({
      isInstalled: false,
      canOpenInApp: false,
    });
  });
});

describe('desktop shell guard', () => {
  afterEach(() => {
    Reflect.deleteProperty(window, 'bangleDesktop');
  });

  it('keeps every PWA affordance off inside the Electron shell', async () => {
    Object.defineProperty(window, 'bangleDesktop', {
      configurable: true,
      value: { platform: 'darwin' },
    });
    Object.defineProperty(window.navigator, 'getInstalledRelatedApps', {
      configurable: true,
      value: vi.fn(() => Promise.resolve([{ platform: 'webapp' }])),
    });

    try {
      pwaInstall.initializePwaInstallPromptTracking(window);

      const event = makeInstallPromptEvent();
      window.dispatchEvent(event);
      await Promise.resolve();

      // Neither the install prompt nor the (stubbed, positive) related-apps
      // probe may surface anything inside the desktop shell.
      expect(pwaInstall.getPwaInstallSnapshot()).toMatchObject({
        canInstall: false,
        canOpenInApp: false,
      });
    } finally {
      Reflect.deleteProperty(window.navigator, 'getInstalledRelatedApps');
    }
  });
});

describe('install prompt reentrancy', () => {
  it('rejects a second install call while one is already in flight', async () => {
    pwaInstall.initializePwaInstallPromptTracking(window);

    let resolvePrompt: (() => void) | undefined;
    const event = new Event('beforeinstallprompt', {
      cancelable: true,
    }) as Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: 'accepted' }>;
    };
    event.prompt = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolvePrompt = resolve;
        }),
    );
    event.userChoice = Promise.resolve({ outcome: 'accepted' });

    window.dispatchEvent(event);

    const firstInstall = pwaInstall.promptPwaInstall();
    await expect(pwaInstall.promptPwaInstall()).resolves.toBe('unavailable');
    expect(event.prompt).toHaveBeenCalledTimes(1);

    resolvePrompt?.();
    await expect(firstInstall).resolves.toBe('accepted');
  });
});

describe('launch target handling in an open app window', () => {
  function makeWindowStub(hash: string) {
    const location = { hash };
    return { windowStub: { location } as unknown as Window, location };
  }

  it('ignores a payload-less protocol launch so the current route stays put', () => {
    const { windowStub, location } = makeWindowStub('#route=editor');

    pwaInstall.handlePwaLaunchTarget(
      windowStub,
      'https://app.example.com/?launch=web%2Bbangle%3A%2F%2Fopen',
    );

    expect(location.hash).toBe('#route=editor');
  });

  it('navigates to the hash route carried in a protocol launch payload', () => {
    const { windowStub, location } = makeWindowStub('#route=welcome');
    const launchValue = encodeURIComponent(
      `web+bangle://open?hash=${encodeURIComponent(
        'route=editor&wsPath=my-ws:note.md',
      )}`,
    );

    pwaInstall.handlePwaLaunchTarget(
      windowStub,
      `https://app.example.com/?launch=${launchValue}`,
    );

    expect(location.hash).toBe('#route=editor&wsPath=my-ws:note.md');
  });

  it('queues a shortcut intent from a shortcut launch URL', () => {
    const { windowStub, location } = makeWindowStub('#route=editor');

    pwaInstall.handlePwaLaunchTarget(
      windowStub,
      'https://app.example.com/?shortcut=new-note',
    );

    expect(location.hash).toBe('#route=editor');
    const received: unknown[] = [];
    const unsubscribe = pwaInstall.subscribePwaLaunchIntents((intent) => {
      received.push(intent);
    });
    expect(received).toEqual([{ shortcut: 'new-note' }]);
    unsubscribe();
  });

  it('applies the hash route from a captured in-scope link', () => {
    const { windowStub, location } = makeWindowStub('#route=editor');

    pwaInstall.handlePwaLaunchTarget(
      windowStub,
      'https://app.example.com/#route=welcome',
    );

    expect(location.hash).toBe('#route=welcome');
  });

  it('keeps the current route when the launch URL has no hash', () => {
    const { windowStub, location } = makeWindowStub('#route=editor');

    pwaInstall.handlePwaLaunchTarget(windowStub, 'https://app.example.com/');

    expect(location.hash).toBe('#route=editor');
  });
});

describe('opening the installed app', () => {
  afterEach(() => {
    Reflect.deleteProperty(window.navigator, 'getInstalledRelatedApps');
  });

  it('navigates to the protocol URL only when open-in-app is available', async () => {
    const assign = vi.fn();
    const windowStub = {
      location: { assign, hash: '' },
    } as unknown as Window;

    expect(pwaInstall.openPwaApp(windowStub)).toBe(false);
    expect(assign).not.toHaveBeenCalled();

    pwaInstall.initializePwaInstallPromptTracking(window);
    window.dispatchEvent(new Event('appinstalled'));

    expect(pwaInstall.openPwaApp(windowStub)).toBe(true);
    expect(assign).toHaveBeenCalledWith('web+bangle://open');
  });

  it('carries the current hash route in the protocol payload', () => {
    pwaInstall.initializePwaInstallPromptTracking(window);
    window.dispatchEvent(new Event('appinstalled'));

    const assign = vi.fn();
    const windowStub = {
      location: { assign, hash: '#route=editor&wsPath=my-ws:note.md' },
    } as unknown as Window;

    expect(pwaInstall.openPwaApp(windowStub)).toBe(true);
    expect(assign).toHaveBeenCalledWith(
      `web+bangle://open?hash=${encodeURIComponent(
        'route=editor&wsPath=my-ws:note.md',
      )}`,
    );
  });
});

describe('boot launch param consumption', () => {
  function makeWindowStub(href: string) {
    const replaceState = vi.fn();
    const location = { href, hash: new URL(href).hash };
    const windowStub = {
      location,
      history: { state: null, replaceState },
    } as unknown as Window;

    return { windowStub, replaceState, location };
  }

  it('strips the launch param while preserving the hash route', () => {
    const { windowStub, replaceState } = makeWindowStub(
      'https://app.example.com/?launch=web%2Bbangle%3A%2F%2Fopen#route=welcome',
    );

    pwaInstall.consumePwaLaunchParams(windowStub);

    expect(replaceState).toHaveBeenCalledTimes(1);
    const [, , url] = replaceState.mock.calls[0] ?? [];
    expect(String(url)).toBe('https://app.example.com/#route=welcome');
  });

  it('applies the deep-link hash carried in the protocol payload', () => {
    const launchValue = encodeURIComponent(
      `web+bangle://open?hash=${encodeURIComponent(
        'route=editor&wsPath=my-ws:note.md',
      )}`,
    );
    const { windowStub, replaceState, location } = makeWindowStub(
      `https://app.example.com/?launch=${launchValue}`,
    );

    pwaInstall.consumePwaLaunchParams(windowStub);

    expect(replaceState).toHaveBeenCalledTimes(1);
    expect(location.hash).toBe('#route=editor&wsPath=my-ws:note.md');
  });

  it('queues a shortcut intent and strips the shortcut param', () => {
    const { windowStub, replaceState } = makeWindowStub(
      'https://app.example.com/?shortcut=search',
    );

    pwaInstall.consumePwaLaunchParams(windowStub);

    expect(replaceState).toHaveBeenCalledTimes(1);
    const [, , url] = replaceState.mock.calls[0] ?? [];
    expect(String(url)).toBe('https://app.example.com/');

    const received: unknown[] = [];
    const unsubscribe = pwaInstall.subscribePwaLaunchIntents((intent) => {
      received.push(intent);
    });
    expect(received).toEqual([{ shortcut: 'search' }]);
    unsubscribe();
  });

  it('ignores an unknown shortcut value but still strips it', () => {
    const { windowStub, replaceState } = makeWindowStub(
      'https://app.example.com/?shortcut=self-destruct',
    );

    pwaInstall.consumePwaLaunchParams(windowStub);

    expect(replaceState).toHaveBeenCalledTimes(1);
    const received: unknown[] = [];
    const unsubscribe = pwaInstall.subscribePwaLaunchIntents((intent) => {
      received.push(intent);
    });
    expect(received).toEqual([]);
    unsubscribe();
  });

  it('does nothing when no launch-related params are present', () => {
    const { windowStub, replaceState } = makeWindowStub(
      'https://app.example.com/#route=welcome',
    );

    pwaInstall.consumePwaLaunchParams(windowStub);

    expect(replaceState).not.toHaveBeenCalled();
  });
});

describe('launch queue file handling', () => {
  it('delivers markdown file handles as launch intents', async () => {
    let consumer:
      | ((params: {
          targetURL?: string;
          files?: Array<{ name: string; getFile: () => Promise<File> }>;
        }) => void)
      | undefined;
    const windowStub = {
      addEventListener: vi.fn(),
      navigator: {},
      launchQueue: {
        setConsumer: (cb: typeof consumer) => {
          consumer = cb;
        },
      },
    } as unknown as Window;

    pwaInstall.initializePwaInstallPromptTracking(windowStub);
    expect(consumer).toBeDefined();

    const markdownHandle = {
      name: 'ideas.md',
      getFile: () => Promise.resolve(new File(['# hi'], 'ideas.md')),
    };
    consumer?.({
      files: [
        markdownHandle,
        {
          name: 'photo.png',
          getFile: () => Promise.resolve(new File([], 'photo.png')),
        },
      ],
    });

    const received: Array<{ files?: Array<{ name: string }> }> = [];
    const unsubscribe = pwaInstall.subscribePwaLaunchIntents((intent) => {
      received.push(intent);
    });

    expect(received).toHaveLength(1);
    expect(received[0]?.files?.map((file) => file.name)).toEqual(['ideas.md']);
    unsubscribe();
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
