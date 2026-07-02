export const DESKTOP_PLATFORM_ATTRIBUTE = 'data-bangle-desktop-platform';

export function markDesktopPlatform(
  documentRef: Pick<Document, 'documentElement'>,
  platform: string,
): void {
  documentRef.documentElement.setAttribute(
    DESKTOP_PLATFORM_ATTRIBUTE,
    platform,
  );
}
