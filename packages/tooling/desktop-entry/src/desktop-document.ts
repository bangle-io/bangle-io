export const DESKTOP_PLATFORM_ATTRIBUTE = 'data-bangle-desktop-platform';

export function markDesktopPlatform(
  documentRef: Pick<Document, 'documentElement'>,
  platform: string,
): void {
  // In a sandboxed preload this can run before the document is parsed, so
  // `documentElement` may be null. Skip silently; the marker is also applied
  // on `dom-ready` from the main process (see `installDesktopDocumentMarker`).
  const root: HTMLElement | null = documentRef.documentElement;
  root?.setAttribute(DESKTOP_PLATFORM_ATTRIBUTE, platform);
}
