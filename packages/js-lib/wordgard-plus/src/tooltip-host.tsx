import type { Tooltip, Wordgard } from '@bangle.io/wordgard-utils';
import { atom, type PrimitiveAtom } from 'jotai';
import { useAtomValue } from 'jotai/react';
import type { ReactNode } from 'react';
import React from 'react';
import { createPortal } from 'react-dom';
import type { JotaiStore } from './bridge';

type PortalEntry = {
  dom: HTMLElement;
  content: ReactNode;
};

/**
 * Shared registry connecting {@link reactTooltip} views to the
 * {@link TooltipHost} that portals React into them. Create one per React
 * tree (per store) and pass it to both sides.
 */
export type TooltipHostHandle = {
  readonly store: JotaiStore;
  /** @internal */
  readonly $portals: PrimitiveAtom<ReadonlyMap<number, PortalEntry>>;
  /** @internal */
  nextId: number;
};

export function createTooltipHost(store: JotaiStore): TooltipHostHandle {
  return {
    store,
    $portals: atom<ReadonlyMap<number, PortalEntry>>(new Map()),
    nextId: 0,
  };
}

function addPortal(
  handle: TooltipHostHandle,
  id: number,
  entry: PortalEntry,
): void {
  const current = handle.store.get(handle.$portals);
  const next = new Map(current);
  next.set(id, entry);
  handle.store.set(handle.$portals, next);
}

function removePortal(handle: TooltipHostHandle, id: number): void {
  const current = handle.store.get(handle.$portals);
  if (!current.has(id)) {
    return;
  }
  const next = new Map(current);
  next.delete(id);
  handle.store.set(handle.$portals, next);
}

/**
 * Builds a {@link Tooltip} whose view hosts a React subtree. Wordgard owns
 * geometry and lifecycle — the tooltip element is anchored to a document
 * position, flipped/clipped, and repositioned by the editor — while React
 * owns the content: on `connect` the subtree is portaled into the view's
 * DOM by the {@link TooltipHost} rendered in the consumer's tree (so
 * context/providers keep flowing), and on `disconnect` it is released.
 * Wordgard never knows React exists.
 *
 * Provide the returned tooltip through the `Tooltip.show` facet (directly,
 * computed, or from a state field) in your own editor config.
 */
export function reactTooltip(config: {
  host: TooltipHostHandle;
  pos: number;
  end?: number;
  above?: boolean;
  strictSide?: boolean;
  arrow?: boolean;
  clip?: boolean;
  /** Extra class for the tooltip element Wordgard positions. */
  className?: string;
  content: (wg: Wordgard) => ReactNode;
}): Tooltip {
  const { host, content, className, ...tooltip } = config;
  return {
    ...tooltip,
    create: (wg) => {
      const dom = document.createElement('div');
      if (className) {
        dom.className = className;
      }
      const id = host.nextId++;
      return {
        dom,
        connect: () => {
          addPortal(host, id, { dom, content: content(wg) });
        },
        disconnect: () => {
          removePortal(host, id);
        },
      };
    },
  };
}

/**
 * Renders the React subtrees of every currently-connected
 * {@link reactTooltip} into the DOM elements Wordgard positions. Mount one
 * per {@link TooltipHostHandle}, anywhere in the tree that has the
 * providers your tooltip content needs.
 */
export function TooltipHost({ handle }: { handle: TooltipHostHandle }) {
  const portals = useAtomValue(handle.$portals, { store: handle.store });
  return (
    <>
      {[...portals.entries()].map(([id, entry]) =>
        createPortal(entry.content, entry.dom, `wordgard-plus-tooltip-${id}`),
      )}
    </>
  );
}
