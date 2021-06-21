import { useCallback, useMemo, useState } from 'react';

export function usePaletteDriver(onEscape, onExecuteItem) {
  const [counter, updateCounter] = useState(0);

  const specialKeys = useMemo(
    () => ['Escape', 'Enter', 'ArrowDown', 'ArrowUp'],
    [],
  );
  const resetCounter = useCallback(() => {
    updateCounter(0);
  }, []);

  const onSelect = useCallback(
    (itemUidOrGetItemUid, source, event) => {
      switch (source) {
        case 'enter':
        case 'click':
          break;
        default: {
          throw new Error('Unknown select source ' + source);
        }
      }

      onExecuteItem(
        // for consistency make it a function
        typeof itemUidOrGetItemUid === 'function'
          ? itemUidOrGetItemUid
          : () => itemUidOrGetItemUid,
        {
          source: source,
          metaKey: Boolean(event.metaKey),
          shiftKey: Boolean(event.shiftKey),
        },
      );
    },
    [onExecuteItem],
  );

  const onSpecialKey = useCallback(
    (event) => {
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
          onSelect(
            (items) => items[getActiveIndex(counter, items.length)]?.uid,
            'enter',
            event,
          );
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
    [counter, onEscape, onSelect],
  );

  const paletteItemProps = useMemo(() => {
    return { onSelect, counter };
  }, [onSelect, counter]);

  const inputProps = useMemo(() => {
    return { onSpecialKey, specialKeys };
  }, [onSpecialKey, specialKeys]);
  return {
    inputProps,
    resetCounter,
    updateCounter,
    paletteItemProps,
  };
}

export function getActiveIndex(counter, size) {
  const r = counter % size;
  return r < 0 ? r + size : r;
}
