import React, { useCallback, useContext, useEffect } from 'react';
import { SideBarRow } from '../../components/Aside/SideBarRow';
import { getActiveIndex } from '../get-active-index';
import { PaletteContext } from '../PaletteContext';

export function PaletteType({ items, executeItem, match }) {
  const paletteState = useContext(PaletteContext);
  const { execute, current, clear } = paletteState;

  const onExecuteItem = useCallback(
    (activeItemIndex) => {
      if (!current) {
        return null;
      }
      const { counter } = current;

      activeItemIndex =
        activeItemIndex == null
          ? getActiveIndex(counter, items.length)
          : activeItemIndex;

      const item = items[activeItemIndex];
      if (!item) {
        return;
      }
      executeItem(item);
      clear();
    },
    [items, executeItem, clear, current],
  );

  useEffect(() => {
    if (!current) {
      return;
    }
    // parent signals execution by setting execute to true
    // and expects the child to call dismiss once executed
    if (execute === true && match.test(current.type)) {
      onExecuteItem();
    }
  }, [execute, onExecuteItem, match, current]);

  if (!current) {
    return null;
  }

  const { type, counter } = current;

  if (!match.test(type)) {
    return null;
  }

  return items.map((item, i) => (
    <SideBarRow
      key={item.uid}
      isActive={getActiveIndex(counter, items.length) === i}
      title={item.title}
      onClick={() => onExecuteItem(i)}
    />
  ));
}
