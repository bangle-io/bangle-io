export type PwaInstallOutcome = 'accepted' | 'dismissed' | 'unavailable';

export interface PwaInstallSnapshot {
  canInstall: boolean;
  isInstalled: boolean;
  isInstalling: boolean;
  isStandalone: boolean;
  canOpenInApp: boolean;
  /**
   * True when the install happened during this page's lifetime (the
   * `appinstalled` event) rather than being detected from a previous
   * session. Chrome auto-opens the app window right after installing, so
   * same-session installs must not additionally prompt "Open in the app?".
   */
  installedThisSession: boolean;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform?: string;
  }>;
}

interface InstalledRelatedApp {
  platform: string;
  url?: string;
  id?: string;
}

type NavigatorWithInstalledRelatedApps = Navigator & {
  getInstalledRelatedApps?: () => Promise<InstalledRelatedApp[]>;
};

// Set by the Electron preload script (contextBridge) before any page script
// runs. Inside the desktop shell every PWA affordance must stay off: the
// desktop app IS the installed experience.
type WindowWithDesktopBridge = Window & {
  bangleDesktop?: unknown;
};

export type PwaShortcutAction = 'new-note' | 'search';

/**
 * A launch that needs application services to act on (manifest shortcuts).
 * Deep-link hashes are applied directly to the URL by this module and never
 * appear here.
 */
export interface PwaLaunchIntent {
  shortcut?: PwaShortcutAction;
}

interface PwaLaunchParams {
  targetURL?: string;
}

type WindowWithLaunchQueue = Window & {
  launchQueue?: {
    setConsumer: (consumer: (params: PwaLaunchParams) => void) => void;
  };
};

type DocumentWithSubtitle = Document & {
  subtitle?: string;
};

type TitlebarAreaRect = Pick<DOMRectReadOnly, 'height' | 'width' | 'x' | 'y'>;

type WindowControlsOverlayGeometryChangeEvent = Event & {
  titlebarAreaRect?: TitlebarAreaRect;
};

type WindowControlsOverlay = EventTarget & {
  visible: boolean;
  getTitlebarAreaRect?: () => TitlebarAreaRect;
};

type NavigatorWithWindowControlsOverlay = {
  windowControlsOverlay: WindowControlsOverlay;
};

const APP_DOCUMENT_TITLE = 'Bangle.io';
const APP_DOCUMENT_SUBTITLE = 'Notes';
const WINDOW_CONTROLS_OVERLAY_ATTRIBUTE = 'data-bangle-window-controls-overlay';
const WINDOW_CONTROLS_OVERLAY_CONTROLS_ATTRIBUTE =
  'data-bangle-window-controls-overlay-controls';
const TITLEBAR_EDGE_OCCLUSION_EPSILON = 0.5;
// Registered in manifest.webmanifest `protocol_handlers`; navigating to this
// scheme from a browser tab launches the installed PWA.
const PWA_PROTOCOL_LAUNCH_URL = 'web+bangle://open';
const PWA_LAUNCH_QUERY_PARAM = 'launch';
const PWA_SHORTCUT_QUERY_PARAM = 'shortcut';

let initializedWindow: Window | undefined;
let trackingAbortController: AbortController | undefined;
let deferredInstallPrompt: BeforeInstallPromptEvent | undefined;
let installedByAppEvent = false;
let installedRelatedAppDetected = false;
let isInstalling = false;
let currentSnapshot: PwaInstallSnapshot = {
  canInstall: false,
  isInstalled: false,
  isInstalling: false,
  isStandalone: false,
  canOpenInApp: false,
  installedThisSession: false,
};

const listeners = new Set<() => void>();

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

let pendingLaunchIntents: PwaLaunchIntent[] = [];
const launchIntentListeners = new Set<(intent: PwaLaunchIntent) => void>();

function enqueuePwaLaunchIntent(intent: PwaLaunchIntent) {
  if (!intent.shortcut) {
    return;
  }

  if (launchIntentListeners.size === 0) {
    pendingLaunchIntents.push(intent);
    return;
  }

  for (const listener of launchIntentListeners) {
    listener(intent);
  }
}

/**
 * Delivers manifest-shortcut launches to the app layer. Intents that arrive
 * before any subscriber (e.g. parsed from the boot URL) are buffered and
 * flushed to the first subscriber.
 */
export function subscribePwaLaunchIntents(
  listener: (intent: PwaLaunchIntent) => void,
) {
  launchIntentListeners.add(listener);

  const buffered = pendingLaunchIntents;
  pendingLaunchIntents = [];
  for (const intent of buffered) {
    listener(intent);
  }

  return () => {
    launchIntentListeners.delete(listener);
  };
}

function getCurrentWindow() {
  return typeof window === 'undefined' ? undefined : window;
}

function isStandaloneDisplay(windowRef: Window) {
  const navigatorWithStandalone = windowRef.navigator as Navigator & {
    standalone?: boolean;
  };

  return (
    windowRef.matchMedia?.('(display-mode: standalone)').matches === true ||
    navigatorWithStandalone.standalone === true
  );
}

function getWindowControlsOverlayControls(
  rect: TitlebarAreaRect,
  viewportWidth: number,
) {
  const hasLeftControls = rect.x > TITLEBAR_EDGE_OCCLUSION_EPSILON;
  const hasRightControls =
    viewportWidth > 0
      ? viewportWidth - rect.x - rect.width > TITLEBAR_EDGE_OCCLUSION_EPSILON
      : rect.x <= TITLEBAR_EDGE_OCCLUSION_EPSILON;

  if (hasLeftControls && hasRightControls) {
    return 'both';
  }

  if (hasLeftControls) {
    return 'left';
  }

  if (hasRightControls) {
    return 'right';
  }

  return 'none';
}

export function syncAppDocumentTitle(documentRef: Document | undefined) {
  if (!documentRef) {
    return;
  }

  documentRef.title = APP_DOCUMENT_TITLE;

  const documentWithSubtitle = documentRef as DocumentWithSubtitle;
  if ('subtitle' in documentWithSubtitle) {
    documentWithSubtitle.subtitle = APP_DOCUMENT_SUBTITLE;
  }
}

export function syncWindowControlsOverlayState(input: {
  documentRef: Document | undefined;
  navigatorRef: Navigator | NavigatorWithWindowControlsOverlay | undefined;
  signal?: AbortSignal;
}) {
  const { documentRef, navigatorRef, signal } = input;
  const windowControlsOverlay =
    navigatorRef && 'windowControlsOverlay' in navigatorRef
      ? navigatorRef.windowControlsOverlay
      : undefined;

  if (!documentRef || !windowControlsOverlay) {
    return;
  }

  const documentElement = documentRef.documentElement;

  const updateTitlebarGeometry = (rect: TitlebarAreaRect | undefined) => {
    if (!rect) {
      return;
    }

    documentElement.style.setProperty(
      '--bangle-titlebar-area-x',
      `${rect.x}px`,
    );
    documentElement.style.setProperty(
      '--bangle-titlebar-area-y',
      `${rect.y}px`,
    );
    documentElement.style.setProperty(
      '--bangle-titlebar-area-width',
      `${rect.width}px`,
    );
    documentElement.style.setProperty(
      '--bangle-titlebar-area-height',
      `${rect.height}px`,
    );
    documentElement.setAttribute(
      WINDOW_CONTROLS_OVERLAY_CONTROLS_ATTRIBUTE,
      getWindowControlsOverlayControls(rect, documentElement.clientWidth),
    );
  };

  const syncOverlayGeometry = (
    event?: WindowControlsOverlayGeometryChangeEvent,
  ) => {
    documentElement.setAttribute(
      WINDOW_CONTROLS_OVERLAY_ATTRIBUTE,
      windowControlsOverlay.visible ? 'visible' : 'hidden',
    );

    updateTitlebarGeometry(
      event?.titlebarAreaRect ?? windowControlsOverlay.getTitlebarAreaRect?.(),
    );
  };

  syncOverlayGeometry();
  windowControlsOverlay.addEventListener(
    'geometrychange',
    (event) => {
      syncOverlayGeometry(event as WindowControlsOverlayGeometryChangeEvent);
    },
    { signal },
  );
}

function isDesktopShell(windowRef: Window) {
  return (windowRef as WindowWithDesktopBridge).bangleDesktop !== undefined;
}

export function initializePwaInstallPromptTracking(
  windowRef: Window | undefined = getCurrentWindow(),
) {
  if (!windowRef || initializedWindow === windowRef) {
    return;
  }

  if (isDesktopShell(windowRef)) {
    return;
  }

  trackingAbortController?.abort();
  trackingAbortController = new AbortController();
  initializedWindow = windowRef;
  const signal = trackingAbortController.signal;

  windowRef.addEventListener(
    'beforeinstallprompt',
    (event) => {
      if (isStandaloneDisplay(windowRef)) {
        return;
      }

      event.preventDefault();
      deferredInstallPrompt = event as BeforeInstallPromptEvent;
      emitChange();
    },
    { signal },
  );

  windowRef.addEventListener(
    'appinstalled',
    () => {
      installedByAppEvent = true;
      deferredInstallPrompt = undefined;
      emitChange();
    },
    { signal },
  );

  const standaloneQuery = windowRef.matchMedia?.('(display-mode: standalone)');
  standaloneQuery?.addEventListener?.('change', emitChange, { signal });

  if (!isStandaloneDisplay(windowRef)) {
    void probeInstalledRelatedApps(windowRef);
  }

  const launchQueue = (windowRef as WindowWithLaunchQueue).launchQueue;
  launchQueue?.setConsumer((params) => {
    if (params.targetURL) {
      handlePwaLaunchTarget(windowRef, params.targetURL);
    }
  });
}

function parseShortcutAction(
  value: string | null,
): PwaShortcutAction | undefined {
  return value === 'new-note' || value === 'search' ? value : undefined;
}

/**
 * Extracts the app hash route carried by a `web+bangle://open?hash=...`
 * protocol payload, e.g. produced by {@link openPwaApp} in a browser tab.
 */
function parseProtocolDeepLinkHash(launchValue: string): string | undefined {
  let url: URL;
  try {
    url = new URL(launchValue);
  } catch {
    return undefined;
  }

  if (url.protocol !== 'web+bangle:') {
    return undefined;
  }

  const hash = url.searchParams.get('hash');
  return hash ? `#${hash}` : undefined;
}

/**
 * Applies a launch forwarded into an already-open app window by the
 * `focus-existing` launch handler. A `web+bangle` protocol launch focuses
 * the window (the browser has done that already) and applies the hash route
 * carried in its payload, if any; a manifest shortcut URL is queued as a
 * launch intent; a captured in-scope link carries its route in the hash,
 * which the hash router picks up without a reload.
 */
export function handlePwaLaunchTarget(windowRef: Window, targetUrl: string) {
  let url: URL;
  try {
    url = new URL(targetUrl);
  } catch {
    return;
  }

  const launchValue = url.searchParams.get(PWA_LAUNCH_QUERY_PARAM);
  if (launchValue !== null) {
    const deepLinkHash = parseProtocolDeepLinkHash(launchValue);
    if (deepLinkHash && deepLinkHash !== windowRef.location.hash) {
      windowRef.location.hash = deepLinkHash;
    }
    return;
  }

  const shortcut = parseShortcutAction(
    url.searchParams.get(PWA_SHORTCUT_QUERY_PARAM),
  );
  if (shortcut) {
    enqueuePwaLaunchIntent({ shortcut });
    return;
  }

  if (url.hash && url.hash !== windowRef.location.hash) {
    windowRef.location.hash = url.hash;
  }
}

async function probeInstalledRelatedApps(windowRef: Window) {
  const navigatorRef = windowRef.navigator as NavigatorWithInstalledRelatedApps;
  if (typeof navigatorRef.getInstalledRelatedApps !== 'function') {
    return;
  }

  try {
    const relatedApps = await navigatorRef.getInstalledRelatedApps();
    // Only the deployment's own install counts. The manifest also lists the
    // production app as a related application on previews/staging/dev, and a
    // production install must not light up open-in-app on other origins
    // (e.g. a dev server tab on a machine that has the production app).
    const hasInstalledSelf = relatedApps.some(
      (app) =>
        app.platform === 'webapp' &&
        app.url !== undefined &&
        isSameOrigin(app.url, windowRef.location.origin),
    );
    if (hasInstalledSelf && !installedRelatedAppDetected) {
      installedRelatedAppDetected = true;
      emitChange();
    }
  } catch {
    // Detection is best-effort; failures mean we keep treating the app as
    // not installed on this device.
  }
}

function isSameOrigin(url: string, origin: string): boolean {
  try {
    return new URL(url).origin === origin;
  } catch {
    return false;
  }
}

function computePwaInstallSnapshot(): PwaInstallSnapshot {
  const windowRef = initializedWindow ?? getCurrentWindow();
  const isStandalone = Boolean(windowRef && isStandaloneDisplay(windowRef));
  const isInstalled = Boolean(
    windowRef &&
      (installedByAppEvent || installedRelatedAppDetected || isStandalone),
  );

  return {
    canInstall: Boolean(deferredInstallPrompt && !isInstalled && !isInstalling),
    isInstalled,
    isInstalling,
    isStandalone,
    canOpenInApp: isInstalled && !isStandalone,
    installedThisSession: installedByAppEvent,
  };
}

export function getPwaInstallSnapshot(): PwaInstallSnapshot {
  const nextSnapshot = computePwaInstallSnapshot();
  if (
    currentSnapshot.canInstall === nextSnapshot.canInstall &&
    currentSnapshot.isInstalled === nextSnapshot.isInstalled &&
    currentSnapshot.isInstalling === nextSnapshot.isInstalling &&
    currentSnapshot.isStandalone === nextSnapshot.isStandalone &&
    currentSnapshot.canOpenInApp === nextSnapshot.canOpenInApp &&
    currentSnapshot.installedThisSession === nextSnapshot.installedThisSession
  ) {
    return currentSnapshot;
  }

  currentSnapshot = nextSnapshot;

  return currentSnapshot;
}

export function subscribePwaInstallPrompt(listener: () => void) {
  initializePwaInstallPromptTracking();
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export async function promptPwaInstall(): Promise<PwaInstallOutcome> {
  const installPrompt = deferredInstallPrompt;
  if (isInstalling || !installPrompt || getPwaInstallSnapshot().isInstalled) {
    return 'unavailable';
  }

  isInstalling = true;
  emitChange();

  try {
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    deferredInstallPrompt = undefined;

    return choice.outcome;
  } catch {
    deferredInstallPrompt = undefined;
    return 'unavailable';
  } finally {
    isInstalling = false;
    emitChange();
  }
}

/**
 * Launches the installed PWA from a browser tab by navigating to the
 * `web+bangle` protocol registered in the web app manifest. The tab's
 * current hash route travels in the payload so the app can land on the same
 * note. The current tab stays on the web app; the browser hands the launch
 * off to the installed app (after a one-time confirmation). Only meaningful
 * when the snapshot reports `canOpenInApp`.
 */
export function openPwaApp(
  windowRef: Window | undefined = getCurrentWindow(),
): boolean {
  if (!windowRef || !getPwaInstallSnapshot().canOpenInApp) {
    return false;
  }

  const currentHash = windowRef.location.hash.replace(/^#/, '');
  const launchUrl = currentHash
    ? `${PWA_PROTOCOL_LAUNCH_URL}?hash=${encodeURIComponent(currentHash)}`
    : PWA_PROTOCOL_LAUNCH_URL;

  windowRef.location.assign(launchUrl);

  return true;
}

/**
 * Consumes the launch-related query params a PWA launch appends to the
 * start URL: `?launch=` (protocol launches, whose payload may carry a hash
 * route to deep-link into) and `?shortcut=` (manifest shortcuts, queued as
 * launch intents). Both params are stripped so the visible URL stays
 * canonical; a deep-link hash is applied via `location.hash` so the running
 * hash router observes the change.
 */
export function consumePwaLaunchParams(
  windowRef: Window | undefined = getCurrentWindow(),
) {
  if (!windowRef) {
    return;
  }

  const url = new URL(windowRef.location.href);
  const launchValue = url.searchParams.get(PWA_LAUNCH_QUERY_PARAM);
  const shortcut = parseShortcutAction(
    url.searchParams.get(PWA_SHORTCUT_QUERY_PARAM),
  );

  if (launchValue === null && !url.searchParams.has(PWA_SHORTCUT_QUERY_PARAM)) {
    return;
  }

  url.searchParams.delete(PWA_LAUNCH_QUERY_PARAM);
  url.searchParams.delete(PWA_SHORTCUT_QUERY_PARAM);
  windowRef.history.replaceState(windowRef.history.state, '', url);

  const deepLinkHash = launchValue
    ? parseProtocolDeepLinkHash(launchValue)
    : undefined;
  if (deepLinkHash && deepLinkHash !== windowRef.location.hash) {
    windowRef.location.hash = deepLinkHash;
  }

  if (shortcut) {
    enqueuePwaLaunchIntent({ shortcut });
  }
}
