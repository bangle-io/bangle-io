import { useCallback, useMemo, useState } from 'react';

import type { ItemType } from './PaletteItem';

export function useActivePaletteItem(items: ItemType[], counter: number) {
  return useMemo(() => {
    return items[getActiveIndex(counter, items.length)];
  }, [items, counter]);
}

export type PaletteOnExecuteItem = (
  cb: (items: ItemType[]) => string | undefined,
  info: { source: string; metaKey: boolean; shiftKey: boolean },
) =>
  | void
  | Promise<void>
  | {
      shouldPreventFocus?: boolean;
    };

export function usePaletteDriver(
  onEscape: () => void,
  onExecuteItem: PaletteOnExecuteItem,
) {
  const [counter, updateCounter] = useState(0);

  const specialKeys = useMemo(
    () => ['Escape', 'Enter', 'ArrowDown', 'ArrowUp'],
    [],
  );
  const resetCounter = useCallback(() => {
    updateCounter(0);
  }, []);

  const onSelect = useCallback(
    (
      event:
        | React.KeyboardEvent<HTMLInputElement>
        | React.MouseEvent<HTMLDivElement>,
    ) => {
      event.preventDefault();
      event.stopPropagation();
      const source2 = event.type;

      switch (source2) {
        case 'keydown':
        case 'click':
          break;
        default: {
          throw new Error('Unknown select source ' + source2);
        }
      }

      const uid = event.currentTarget.getAttribute('data-id');
      onExecuteItem(
        uid
          ? () => uid
          : // when you press enter you cannot get the uid as the event.target is input
            (items) => items[getActiveIndex(counter, items.length)]?.uid,
        {
          source: source2,
          metaKey: Boolean(event.metaKey),
          shiftKey: Boolean(event.shiftKey),
        },
      );
    },
    [onExecuteItem, counter],
  );

  const onSpecialKey = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      switch (event.key) {
        case 'ArrowUp': {
          updateCounter((c) => c - 1);
          break;
        }
        case 'ArrowDown': {
          updateCounter((c) => c + 1);
          break;
        }
        case 'Enter': {
          onSelect(event);
          break;
        }
        case 'Escape': {
          onEscape();
          break;
        }
        default: {
          throw new Error('Unknown key ' + event.key);
        }
      }
    },
    [onEscape, onSelect],
  );

  const inputProps = useMemo(() => {
    return { onSpecialKey, specialKeys };
  }, [onSpecialKey, specialKeys]);

  return {
    inputProps,
    counter,
    onSelect,
    resetCounter,
    updateCounter,
  };
}

export function getActiveIndex(counter: number, size: number) {
  const r = counter % size;

  return r < 0 ? r + size : r;
}
