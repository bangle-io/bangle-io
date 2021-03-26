import './Palette.css';

import React, { createRef, useCallback, useEffect, useState } from 'react';
import { keyName } from 'w3c-keyname';
import PropTypes from 'prop-types';
import { useWatchClickOutside } from '../misc/hooks';
import { SideBarRow } from '../components/Aside/SideBarRow';

const ResolvePaletteItemShape = PropTypes.shape({
  uid: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  data: PropTypes.object,
  onExecuteItem: PropTypes.func.isRequired,
});

PaletteUI.propTypes = {
  paletteType: PropTypes.string,
  updatePalette: PropTypes.func.isRequired,
  paletteInitialQuery: PropTypes.string,
  parseRawQuery: PropTypes.func.isRequired,
  generateRawQuery: PropTypes.func.isRequired,
  paletteItems: PropTypes.array.isRequired,
};
/**
 * UI abstraction for building a palette with keyboard and click handlers.
 *
 * @param {string|undefined} paletteType
 * @param {Function} parseRawQuery - a function with params (paletteType, rawQuery) which will be called with the raw string
 *                    in the input field, expected it to return {paletteType, query}.
 * @param {Function} generateRawQuery - a function with params (paletteType, query), think opposite of `parseRawQuery`
 *                    you are expected to return a string which will be set in the input field.
 * @param {Function} updatePalette - A callback with named params {type, initialQuery}
 *            will call with {type: null} for dismissing the palette.
 * @param {Array|Function|paletteItems|ResolvePaletteItemShape|undefined} paletteItems - nested data structure which will be
 *         flattened on render and used to display a list below the input field.
 *         Lazy items - if an item is a function it will be called
 *         with an object { paletteType, query } so that the consumers can
 *         implement query based filtering logic on their end.
 *         See `ResolvePaletteItemShape` for the shape of expected return type of the function.
 */
export function PaletteUI({
  paletteType,
  updatePalette,
  paletteInitialQuery = '',
  parseRawQuery,
  generateRawQuery,
  paletteItems,
}) {
  const [query, updateQuery] = useState(paletteInitialQuery);
  const [counter, updateCounter] = useState(0);

  const onDismiss = useCallback(() => {
    updatePalette({ type: null });
  }, [updatePalette]);

  useEffect(() => {
    updateQuery(paletteInitialQuery);
    updateCounter(0);
  }, [paletteType, paletteInitialQuery]);

  if (!paletteType) {
    return null;
  }

  return (
    <PaletteContainer
      updatePalette={updatePalette}
      paletteType={paletteType}
      updateCounter={updateCounter}
      updateQuery={updateQuery}
      counter={counter}
      query={query}
      parseRawQuery={parseRawQuery}
      generateRawQuery={generateRawQuery}
      resolvedItems={resolvePaletteItems(paletteItems, query, paletteType)}
      onDismiss={onDismiss}
    />
  );
}

PaletteContainer.propTypes = {
  resolvedItems: PropTypes.arrayOf(ResolvePaletteItemShape).isRequired,
};

export function PaletteContainer({
  updatePalette,
  paletteType,
  updateCounter,
  updateQuery,
  counter,
  query,
  parseRawQuery,
  generateRawQuery,
  resolvedItems,
  onDismiss,
}) {
  const paletteInputRef = createRef();
  const containerRef = useWatchClickOutside(onDismiss, () => {
    paletteInputRef.current.focus();
  });

  const activeItemIndex = getActiveIndex(counter, resolvedItems.length);

  const executeHandler = useCallback(
    (itemIndex) => {
      const item = resolvedItems[itemIndex];

      if (!item) {
        return;
      }

      item.onExecuteItem(item, itemIndex);

      onDismiss();
    },
    [resolvedItems, onDismiss],
  );

  return (
    <div
      className="bangle-palette z-30 p-2 shadow-md border flex flex-col"
      ref={containerRef}
    >
      <PaletteInput
        ref={paletteInputRef}
        onDismiss={onDismiss}
        updatePalette={updatePalette}
        updateCounter={updateCounter}
        updateQuery={updateQuery}
        paletteType={paletteType}
        counter={counter}
        query={query}
        generateRawQuery={generateRawQuery}
        parseRawQuery={parseRawQuery}
        executeHandler={executeHandler}
        activeItemIndex={activeItemIndex}
      />
      {resolvedItems.map((item, i) => {
        return (
          <SideBarRow
            key={item.uid}
            isActive={getActiveIndex(counter, resolvedItems.length) === i}
            title={item.title}
            onClick={() => executeHandler(i)}
          />
        );
      })}
    </div>
  );
}

export const PaletteInput = React.forwardRef(
  (
    {
      paletteType,
      onDismiss,
      updateCounter,
      updatePalette,
      updateQuery,
      counter,
      query,
      generateRawQuery,
      parseRawQuery,
      executeHandler,
      activeItemIndex,
    },
    paletteInputRef,
  ) => {
    return (
      <PaletteInputUI
        ref={paletteInputRef}
        onDismiss={onDismiss}
        onPressEnter={() => {
          executeHandler(activeItemIndex);
        }}
        updateCounter={updateCounter}
        updateQuery={(rawQuery) => {
          const initialPaletteType = paletteType;
          const { paletteType: newType, query } = parseRawQuery(
            initialPaletteType,
            rawQuery,
          );

          if (newType !== initialPaletteType) {
            updatePalette({ type: newType, initialQuery: query });
          } else {
            updateQuery(query);
          }
        }}
        query={generateRawQuery(paletteType, query)}
        counter={counter}
      />
    );
  },
);

export const PaletteInputUI = React.forwardRef(
  (
    { onDismiss, onPressEnter, updateCounter, updateQuery, query, counter },
    inputRef,
  ) => {
    const handleOnInputPromptChange = useCallback(
      (e) => {
        updateQuery(e.target.value);
      },
      [updateQuery],
    );

    const onInputPressKey = (event) => {
      const key = keyName(event);
      if (key === 'Escape') {
        onDismiss();
        event.preventDefault();
        return;
      }

      if (key === 'Enter') {
        onPressEnter({ query, counter });
        event.preventDefault();
        return;
      }

      if (key === 'ArrowDown' || key === 'ArrowUp') {
        const dir = key === 'ArrowUp' ? -1 : 1;
        updateCounter((counter || 0) + dir);
        event.preventDefault();
        return;
      }
    };

    useEffect(() => {
      inputRef.current.focus();
    }, [inputRef]);

    return (
      <div className="flex mb-2 sticky top-0">
        <input
          type="text"
          aria-label="palette-input"
          className="flex-grow px-2"
          ref={inputRef}
          value={query}
          onChange={handleOnInputPromptChange}
          onKeyDown={onInputPressKey}
        />
      </div>
    );
  },
);

PaletteInputUI.propTypes = {
  onDismiss: PropTypes.func.isRequired,
  onPressEnter: PropTypes.func.isRequired,
  updateCounter: PropTypes.func.isRequired,
  updateQuery: PropTypes.func.isRequired,
  query: PropTypes.string.isRequired,
  counter: PropTypes.number.isRequired,
};

function resolvePaletteItems(paletteItems, query, paletteType) {
  return paletteItems
    .flatMap((item) => {
      if (typeof item === 'function') {
        item = item({ paletteType, query });
      }
      if (Array.isArray(item)) {
        return resolvePaletteItems(item, query, paletteType);
      }

      return item;
    })
    .filter(Boolean);
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
