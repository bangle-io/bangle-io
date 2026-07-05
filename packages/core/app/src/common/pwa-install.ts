export type PwaInstallOutcome = 'accepted' | 'dismissed' | 'unavailable';

export interface PwaInstallSnapshot {
  canInstall: boolean;
  isInstalled: boolean;
  isInstalling: boolean;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform?: string;
  }>;
}

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

let initializedWindow: Window | undefined;
let trackingAbortController: AbortController | undefined;
let deferredInstallPrompt: BeforeInstallPromptEvent | undefined;
let installedByAppEvent = false;
let isInstalling = false;
let currentSnapshot: PwaInstallSnapshot = {
  canInstall: false,
  isInstalled: false,
  isInstalling: false,
};

const listeners = new Set<() => void>();

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
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

export function initializePwaInstallPromptTracking(
  windowRef = getCurrentWindow(),
) {
  if (!windowRef || initializedWindow === windowRef) {
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
}

function computePwaInstallSnapshot(): PwaInstallSnapshot {
  const windowRef = initializedWindow ?? getCurrentWindow();
  const isInstalled = Boolean(
    windowRef && (installedByAppEvent || isStandaloneDisplay(windowRef)),
  );

  return {
    canInstall: Boolean(deferredInstallPrompt && !isInstalled && !isInstalling),
    isInstalled,
    isInstalling,
  };
}

export function getPwaInstallSnapshot(): PwaInstallSnapshot {
  const nextSnapshot = computePwaInstallSnapshot();
  if (
    currentSnapshot.canInstall === nextSnapshot.canInstall &&
    currentSnapshot.isInstalled === nextSnapshot.isInstalled &&
    currentSnapshot.isInstalling === nextSnapshot.isInstalling
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
  if (!installPrompt || getPwaInstallSnapshot().isInstalled) {
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
