import React, {
  useMemo,
  useRef,
  useCallback,
  useState,
  useEffect,
} from 'react';
import { sleep } from 'utils/utility';
import {
  MagicInputPalette,
  MagicPaletteContainer,
  usePaletteDriver,
  MagicPaletteItemsContainer,
  MagicPaletteItem,
  MagicPaletteItemUI,
} from 'magic-palette/index';

export function ListModal({
  placeholder,
  initialValue = '',
  dismissModal,
  items,
  onSelectItem,
  error,
  children,
  updateError,
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

  const { inputProps, resetCounter, paletteItemProps } = usePaletteDriver(
    dismissModal,
    onExecuteItem,
  );

  const onInputValueChange = (value) => {
    _onInputValueChange(value);
    resetCounter();
  };

  return (
    <MagicPaletteContainer
      onClickOutside={() => {
        dismissModal();
      }}
      onClickInside={() => {
        inputRef.current?.focus();
      }}
      widescreen={false}
    >
      <MagicInputPalette
        placeholder={placeholder}
        inputValue={inputValue}
        onInputValueChange={onInputValueChange}
        ref={inputRef}
        {...inputProps}
      />
      <MagicPaletteItemsContainer>
        {errorItem && (
          <MagicPaletteItemUI
            uid={errorItem.uid}
            title={errorItem.title}
            description={errorItem.description}
            style={{
              backgroundColor: 'var(--error-bg-color)',
            }}
          />
        )}
        {items.map((item, i) => (
          <MagicPaletteItem
            uid={item.uid}
            items={items}
            title={item.title}
            extraInfo={item.extraInfo}
            description={item.description}
            key={item.uid}
            isDisabled={item.disabled}
            {...paletteItemProps}
          />
        ))}
      </MagicPaletteItemsContainer>
      {children}
    </MagicPaletteContainer>
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
