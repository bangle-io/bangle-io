import {
  autoUpdate,
  computePosition,
  flip,
  inline as inlineMiddleware,
  offset,
  type Placement,
  shift,
  type VirtualElement,
} from '@floating-ui/dom';
import { useEffect, useRef } from 'react';

export type UseFloatingPositionProps = {
  show: boolean;
  anchorEl: () => HTMLElement | VirtualElement | null;
  boundaryElement?: Element | null;
  boundarySelector?: string;
  placement?: Placement;
  inline?: boolean;
};

export const FLOATING_INITIAL_STYLE = {
  // this is important to prevent cmdk from causing vertical layout issues due to its scrollIntoView
  display: 'none',
  position: 'absolute',
  left: 0,
  top: 0,
  zIndex: 10,
} as const;

export function useFloatingPosition({
  show,
  anchorEl,
  boundaryElement,
  boundarySelector,
  placement = 'bottom-start',
  inline = false,
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
    const boundary =
      boundaryElement ??
      (boundarySelector ? document.querySelector(boundarySelector) : null);

    if (!anchor) {
      return;
    }

    const cleanup = autoUpdate(anchor, floating, async () => {
      // drawRectangle(anchor); // for debugging
      const { x, y } = await computePosition(anchor, floating, {
        strategy: 'absolute',
        placement,
        middleware: [
          ...(inline ? [inlineMiddleware()] : []),
          offset({
            mainAxis: 8,
          }),
          flip(),
          shift(boundary ? { boundary } : undefined),
        ],
      });

      Object.assign(floating.style, {
        display: 'block',
        position: 'absolute',
        left: `${Math.round(x)}px`,
        top: `${Math.round(y)}px`,
      });
    });

    return () => {
      cleanup();
    };
  }, [show, anchorEl, boundaryElement, boundarySelector, placement, inline]);

  return floatingRef;
}

function _drawRectangle(el: VirtualElement) {
  const rect = el.getBoundingClientRect();
  const RECTANGLE_ID = 'floating-debug-rectangle';
  let div = document.getElementById(RECTANGLE_ID);

  if (!div) {
    div = document.createElement('div');
    div.id = RECTANGLE_ID;
    document.body.appendChild(div);
  }

  Object.assign(div.style, {
    position: 'absolute',
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    backgroundColor: 'rgba(0, 255, 0, 0.2)',
    border: '2px solid rgba(0, 255, 0, 0.5)',
    pointerEvents: 'none',
    zIndex: '9999',
  });

  return () => {
    div?.remove();
  };
}
