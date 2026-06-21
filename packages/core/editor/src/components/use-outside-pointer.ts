import { type RefObject, useEffect } from 'react';

export function useOutsidePointer({
  enabled,
  ownerDocument,
  popupRef,
  onOutside,
}: {
  enabled: boolean;
  ownerDocument: Document;
  popupRef: RefObject<HTMLElement | null>;
  onOutside: () => void;
}) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleOutsidePointer = (event: PointerEvent) => {
      if (!popupRef.current?.contains(event.target as Node)) {
        onOutside();
      }
    };
    ownerDocument.addEventListener('pointerdown', handleOutsidePointer, true);
    return () => {
      ownerDocument.removeEventListener(
        'pointerdown',
        handleOutsidePointer,
        true,
      );
    };
  });
}
