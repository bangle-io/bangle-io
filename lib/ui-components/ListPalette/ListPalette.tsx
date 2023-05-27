import React, { useCallback, useEffect, useRef, useState } from 'react';

import type { PaletteOnExecuteItem } from '../UniversalPalette';
import { UniversalPalette } from '../UniversalPalette';
import type { ItemType } from '../UniversalPalette/PaletteItem';

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
}: {
  placeholder?: string;
  initialValue?: string;
  onDismiss: () => void;
  items: ItemType[];
  onSelectItem: any;
  error: any;
  children: any;
  updateError: any;
  widescreen: any;
}) {
  const [inputValue, _onInputValueChange] = useState(initialValue);
  items = items.filter((obj) => {
    if (typeof obj.title === 'string') {
      return strMatch(obj.title, inputValue);
    }

    return false;
  });
  const inputRef = useRef<HTMLInputElement>(null);

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

  const onExecuteItem = useCallback<PaletteOnExecuteItem>(
    async (getUid) => {
      const uid = getUid(items);
      onSelectItem(items.find((item) => item.uid === uid));
    },
    [onSelectItem, items],
  );

  const { inputProps, counter, resetCounter, onSelect } =
    UniversalPalette.usePaletteDriver(onDismiss, onExecuteItem);

  const activeItem = UniversalPalette.useActivePaletteItem(items, counter);

  const onInputValueChange = (value: string) => {
    _onInputValueChange(value);
    resetCounter();
  };

  return (
    <UniversalPalette.PaletteContainer
      paletteType="list-palette"
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
            onClick={() => {}}
            className="bg-colorCriticalSolidFaint"
          />
        )}
        {items.map((item, i) => (
          <UniversalPalette.PaletteItemUI
            key={item.uid}
            item={item}
            onClick={onSelect}
            isActive={activeItem === item}
          />
        ))}
      </UniversalPalette.PaletteItemsContainer>
      {children}
    </UniversalPalette.PaletteContainer>
  );
}

function strMatch(a: string[] | string, b: string): boolean {
  b = b.toLocaleLowerCase();

  if (Array.isArray(a)) {
    return a.filter(Boolean).some((str) => strMatch(str, b));
  }

  a = a.toLocaleLowerCase();

  return a.includes(b) || b.includes(a);
}
