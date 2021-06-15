import React, { useCallback, useMemo, useRef, useState } from 'react';
import { MagicInputPalette } from '../MagicInputPalette';
import { MagicPaletteItemsContainer } from '../MagicPaletteItemsContainer';
import { MagicPaletteItem } from '../MagicPaletteItem';
import saiyans from './saiyans.json';
import { usePaletteDriver } from '../hooks';
import { MagicPaletteContainer } from '../MagicPaletteContainer';

export function MagicPaletteDriver() {
  const [inputValue, _onInputValueChange] = useState('');
  const inputRef = useRef();
  const items = useMemo(() => {
    return saiyans.characters
      .map((r) => ({
        uid: r.id,
        title: r.name,
        extraInfo: r.race,
        disabled: Math.random() < 0.4,
        showDividerAbove: Math.random() < 0.1,
      }))
      .filter((r) => {
        if (inputValue === '') {
          return true;
        }
        return r.title.toLowerCase().includes(inputValue.toLowerCase());
      });
  }, [inputValue]);

  const onEscape = useCallback(() => {}, []);
  const onExecuteItem = useCallback(
    (getItem, sourceInfo) => {
      const item = getItem(items);
      if (!item || item.disabled) {
        return;
      }
      console.log(item, sourceInfo);
    },
    [items],
  );

  const { inputProps, resetCounter, paletteItemProps } = usePaletteDriver(
    onEscape,
    onExecuteItem,
  );

  const onInputValueChange = (value) => {
    _onInputValueChange(value);
    resetCounter();
  };

  return (
    <MagicPaletteContainer
      onClickOutside={() => {
        console.log('outsdie click');
      }}
      onClickInside={() => {
        console.log('inside click');
      }}
      widescreen={false}
    >
      <MagicInputPalette
        leftIcon={<HomeIcon width={16} height={16} />}
        placeholder="hola migo"
        inputValue={inputValue}
        onInputValueChange={onInputValueChange}
        ref={inputRef}
        {...inputProps}
      />
      <MagicPaletteItemsContainer>
        {items.map((item, i) => (
          <MagicPaletteItem
            uid={item.uid}
            items={items}
            title={item.title}
            extraInfo={item.extraInfo}
            key={item.uid}
            showDividerAbove={item.showDividerAbove}
            rightIcons="-"
            leftIcon={<HomeIcon width={16} height={16} />}
            isDisabled={item.disabled}
            rightHoverIcons={
              <>
                <span>hi</span>
                <span> </span>
                <span>bro</span>
              </>
            }
            {...paletteItemProps}
          />
        ))}
      </MagicPaletteItemsContainer>
    </MagicPaletteContainer>
  );
}

export function HomeIcon(props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      {...props}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5px"
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
      />
    </svg>
  );
}
