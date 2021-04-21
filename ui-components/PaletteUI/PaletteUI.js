import './Palette.css';
import { keyName } from 'w3c-keyname';

import React, { useRef, useCallback, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { cx, useWatchClickOutside } from 'utils/index';
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
  updateCounterRef,
}) {
  const { getItemProps, inputProps } = usePaletteProps({
    onDismiss: dismissPalette,
    resolvedItems: items,
    value,
    updateValue,
    updateCounterRef,
  });

  const inputRef = useRef();

  return (
    <PaletteContainer
      className={className}
      style={style}
      dismissPalette={dismissPalette}
    >
      <PaletteInput
        placeholder={placeholder}
        ref={inputRef}
        paletteIcon={paletteIcon}
        {...inputProps}
      />
      <PaletteItemsContainer>
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
      </PaletteItemsContainer>
    </PaletteContainer>
  );
}

export function PaletteContainer({
  children,
  className,
  style,
  dismissPalette,
}) {
  const containerRef = useWatchClickOutside(dismissPalette, () => {
    document.querySelector('.palette-input')?.focus();
  });

  return (
    <div
      className={cx('bangle-palette palette-container', className)}
      style={style}
      ref={containerRef}
    >
      {children}
    </div>
  );
}

export function PaletteItemsContainer({ className, children }) {
  return (
    <div className={cx('overflow-y-auto palette-items-container', className)}>
      {children}
    </div>
  );
}

export const PaletteInput = React.forwardRef(function PaletteInput(
  { paletteIcon, className, inputClassName, ...props },
  ref,
) {
  useEffect(() => {
    ref.current?.focus();
  }, [ref]);

  return (
    <div
      className={cx('palette-input-wrapper flex py-2 px-2 top-0', className)}
    >
      {paletteIcon}
      <input
        type="text"
        ref={ref}
        autoCapitalize="off"
        spellCheck="false"
        autoCorrect="off"
        aria-label="palette-input"
        className={cx('palette-input flex-grow px-2', inputClassName)}
        {...props}
      />
    </div>
  );
});

export function usePaletteProps({
  onDismiss,
  resolvedItems,
  value,
  updateValue,
  updateCounterRef,
}) {
  const [counter, updateCounter] = useState(0);

  // this is hacky but I couldnt think of
  // a better way to update counter from outside
  useEffect(() => {
    if (updateCounterRef) {
      updateCounterRef.current = updateCounter;
    }
    return () => {
      if (updateCounterRef) {
        updateCounterRef.current = undefined;
      }
    };
  }, [updateCounterRef, updateCounter]);

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
