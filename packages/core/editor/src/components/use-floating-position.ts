import {
  type VirtualElement,
  autoUpdate,
  computePosition,
  flip,
  offset,
  shift,
} from '@floating-ui/dom';
import { useEffect, useRef } from 'react';

type UseFloatingPositionProps = {
  show: boolean;
  anchorEl: () => HTMLElement | VirtualElement | null;
  boundarySelector: string;
};

export function useFloatingPosition({
  show,
  anchorEl,
  boundarySelector,
}: UseFloatingPositionProps) {
  const floatingRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!show) {
      return;
    }
    const floating = floatingRef.current;
    if (!floating) {
      return;
    }

    const anchor = anchorEl();
    const boundary = document.querySelector(boundarySelector);

    if (!anchor || !boundary) {
      return;
    }

    const cleanup = autoUpdate(anchor, floating, async () => {
      const { x, y } = await computePosition(anchor, floating, {
        strategy: 'absolute',
        placement: 'bottom-start',
        middleware: [
          offset({
            mainAxis: 8,
          }),
          flip(),
          shift({ boundary }),
        ],
      });

      Object.assign(floating.style, {
        position: 'absolute',
        left: `${Math.round(x)}px`,
        top: `${Math.round(y)}px`,
      });
    });

    return () => {
      cleanup();
    };
  }, [show, anchorEl, boundarySelector]);

  return floatingRef;
}
