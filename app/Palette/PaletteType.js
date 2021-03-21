import PropTypes from 'prop-types';

import React, { useCallback, useEffect } from 'react';
import { SideBarRow } from '../components/Aside/SideBarRow';
import { getActiveIndex } from './get-active-index';

PaletteType.propTypes = {
  match: PropTypes.instanceOf(RegExp).isRequired,
  paletteItems: PropTypes.shape({
    items: PropTypes.array.isRequired,
    onExecuteItem: PropTypes.func.isRequired,
  }).isRequired,
  counter: PropTypes.number.isRequired,
  paletteType: PropTypes.string.isRequired,
  onDismiss: PropTypes.func.isRequired,
};

export function PaletteType({
  match,
  paletteItems,
  executeActiveItem,
  counter,
  paletteType,
  onDismiss,
}) {
  const { items, onExecuteItem } = paletteItems;
  const activeItemIndex = getActiveIndex(counter, items.length);

  const executeHandler = useCallback(
    (itemIndex) => {
      const item = items[itemIndex];

      if (!item) {
        return;
      }
      onExecuteItem(item);
      onDismiss();
    },
    [items, onExecuteItem, onDismiss],
  );

  useEffect(() => {
    // parent signals execution by setting execute to true
    // and expects the child to call dismiss once executed
    if (executeActiveItem === true && match.test(paletteType)) {
      executeHandler(activeItemIndex);
    }
  }, [activeItemIndex, paletteType, executeActiveItem, executeHandler, match]);

  if (!match.test(paletteType)) {
    return null;
  }

  return items.map((item, i) => (
    <SideBarRow
      key={item.uid}
      isActive={getActiveIndex(counter, items.length) === i}
      title={item.title}
      onClick={() => executeHandler(i)}
    />
  ));
}
