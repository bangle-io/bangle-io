import React, { useRef, useCallback, useState, useEffect } from 'react';
import { UniversalPalette } from '../UniversalPalette/index';

export function ListPalette({
  placeholder,
  initialValue = '',
  onDismiss,
  items,
  onSelectItem,
  error,
  children,
  updateError,
  widescreen,
}) {
  const [inputValue, _onInputValueChange] = useState(initialValue);
  items = items.filter((obj) => strMatch(obj.title, inputValue));
  const inputRef = useRef();

  useEffect(() => {
    updateError?.(undefined);
  }, [inputValue, updateError]);

  useEffect(() => {
    if (error) {
      inputRef.current?.focus();
    }
  }, [error]);

  const errorItem = error && {
    uid: 'error',
    title: '🤦‍♀️ Error',
    description: error.displayMessage || error.message,
  };

  const onExecuteItem = useCallback(
    async (getUid) => {
      const uid = getUid(items);
      onSelectItem(items.find((item) => item.uid === uid));
    },
    [onSelectItem, items],
  );

  const { inputProps, counter, resetCounter, onSelect } =
    UniversalPalette.usePaletteDriver(onDismiss, onExecuteItem);

  const activeItem = UniversalPalette.useActivePaletteItem(items, counter);

  const onInputValueChange = (value) => {
    _onInputValueChange(value);
    resetCounter();
  };

  return (
    <UniversalPalette.PaletteContainer
      widescreen={widescreen}
      onClickOutside={() => {
        onDismiss();
      }}
      onClickInside={() => {
        inputRef.current?.focus();
      }}
    >
      <UniversalPalette.PaletteInput
        placeholder={placeholder}
        inputValue={inputValue}
        onInputValueChange={onInputValueChange}
        ref={inputRef}
        {...inputProps}
      />
      <UniversalPalette.PaletteItemsContainer>
        {errorItem && (
          <UniversalPalette.PaletteItemUI
            item={errorItem}
            isActive={false}
            onSelect={() => {}}
            style={{
              backgroundColor: 'var(--error-bg-color)',
            }}
          />
        )}
        {items.map((item, i) => (
          <UniversalPalette.PaletteItemUI
            key={item.uid}
            item={item}
            onSelect={onSelect}
            isActive={activeItem === item}
          />
        ))}
      </UniversalPalette.PaletteItemsContainer>
      {children}
    </UniversalPalette.PaletteContainer>
  );
}

function strMatch(a, b) {
  b = b.toLocaleLowerCase();
  if (Array.isArray(a)) {
    return a.filter(Boolean).some((str) => strMatch(str, b));
  }

  a = a.toLocaleLowerCase();
  return a.includes(b) || b.includes(a);
}
