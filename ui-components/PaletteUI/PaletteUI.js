import './Palette.css';
import { keyName } from 'w3c-keyname';

import React, { createRef, useCallback, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useWatchClickOutside } from 'utils/index';
import { SidebarRow } from '../SidebarRow';

const ResolvePaletteItemShape = PropTypes.shape({
  uid: PropTypes.string.isRequired,
  title: PropTypes.oneOf([PropTypes.element, PropTypes.string]).isRequired,
  onExecute: PropTypes.func.isRequired,
  rightHoverIcon: PropTypes.element,
  // to store any misc data
  data: PropTypes.object,
});

/**
 * UI abstraction for building a palette with keyboard and click handlers.
 * Pressing enter will execute the item.onPressEnter
 *
 */
export function PaletteUI({
  placeholder,
  paletteIcon,
  style,
  className,
  dismissPalette,
  updateValue,
  value,
  items,
}) {
  const { getItemProps, inputProps } = usePaletteProps({
    onDismiss: dismissPalette,
    resolvedItems: items,
    value,
    updateValue,
  });

  const inputRef = createRef();
  const containerRef = useWatchClickOutside(dismissPalette, () => {
    inputRef.current.focus();
  });

  useEffect(() => {
    inputRef.current?.focus();
  }, [inputRef]);

  return (
    <div className={className} style={style} ref={containerRef}>
      <div className="palette-input-wrapper flex py-2 px-2 top-0">
        {paletteIcon}
        <input
          type="text"
          autoCapitalize="off"
          spellCheck="false"
          autoCorrect="off"
          aria-label="palette-input"
          className="flex-grow px-2"
          ref={inputRef}
          placeholder={placeholder}
          {...inputProps}
        />
      </div>
      <div className="overflow-y-auto">
        {items.map((item, i) => {
          return (
            <SidebarRow
              dataId={item.uid}
              className="palette-row"
              disabled={item.disabled}
              key={item.uid}
              title={item.title}
              rightHoverIcon={item.rightHoverIcon}
              rightIcon={
                <kbd className="whitespace-nowrap">{item.keybinding}</kbd>
              }
              {...getItemProps(item, i)}
            />
          );
        })}
      </div>
    </div>
  );
}

function usePaletteProps({ onDismiss, resolvedItems, value, updateValue }) {
  const [counter, updateCounter] = useState(0);

  const resolvedItemsCount = resolvedItems.length;

  const executeHandler = useCallback(
    (itemIndex, event) => {
      const item = resolvedItems[itemIndex];

      if (!item) {
        return;
      }

      if (item.disabled) {
        return;
      }

      item.onExecute(item, itemIndex, event);
    },
    [resolvedItems],
  );

  const getItemProps = useCallback(
    (item, index) => {
      return {
        isActive: getActiveIndex(counter, resolvedItemsCount) === index,
        onClick: (e) => {
          executeHandler(index, e);
        },
      };
    },
    [executeHandler, counter, resolvedItemsCount],
  );

  const inputProps = useInputProps({
    counter,
    resolvedItemsCount,
    onDismiss,
    executeHandler,
    value,
    updateValue,
    updateCounter,
  });

  return {
    resolvedItems,
    getItemProps,
    inputProps,
  };
}

function useInputProps({
  counter,
  resolvedItemsCount,
  onDismiss,
  executeHandler,
  value,
  updateValue,
  updateCounter,
}) {
  const onChange = useCallback(
    (e) => {
      updateValue(e.target.value);
    },
    [updateValue],
  );

  const onKeyDown = useCallback(
    (event) => {
      const activeItemIndex = getActiveIndex(counter, resolvedItemsCount);
      const key = keyName(event);
      if (key === 'Escape') {
        onDismiss();
        event.preventDefault();
        return;
      }

      if (key === 'Enter') {
        executeHandler(activeItemIndex, event);
        return;
      }

      if (key === 'ArrowDown' || key === 'ArrowUp') {
        const dir = key === 'ArrowUp' ? -1 : 1;

        updateCounter((counter) => (counter || 0) + dir);
        event.preventDefault();
        return;
      }
    },
    [onDismiss, executeHandler, updateCounter, counter, resolvedItemsCount],
  );

  return { onKeyDown, onChange, value };
}
/**
 * Calculate the currently active item
 * @param {*} counter The currently active counter passed to you by this component
 * @param {*} size The total number of elements displayed after applying query
 */
const getActiveIndex = (counter, size) => {
  const r = counter % size;
  return r < 0 ? r + size : r;
};
