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
  onPositioned?: () => void;
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
  onPositioned,
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
      onPositioned?.();
    });

    return () => {
      cleanup();
    };
  }, [
    show,
    anchorEl,
    boundaryElement,
    boundarySelector,
    placement,
    inline,
    onPositioned,
  ]);

  return floatingRef;
}
