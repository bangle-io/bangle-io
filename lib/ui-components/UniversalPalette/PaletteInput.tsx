import React, { useCallback, useEffect } from 'react';

import { cx } from '@bangle.io/utils';

import { Input } from '../Input';

export const PaletteInput = React.forwardRef<
  HTMLInputElement,
  {
    className?: string;
    onInputValueChange: (val: any) => void;
    inputValue: string;
    specialKeys: string[];
    onSpecialKey: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    placeholder?: string;
    leftNode?: JSX.Element;
    // select the value on mount
    selectOnMount?: boolean;
  }
>(
  (
    {
      className,
      onInputValueChange,
      inputValue,
      specialKeys,
      onSpecialKey,
      placeholder,
      leftNode,
      // select the value on mount
      selectOnMount = false,
    },
    ref,
  ) => {
    useEffect(() => {
      // I dont know how to fix this
      (ref as any).current?.focus();
    }, [ref]);

    const onFocus = useCallback(
      (event) => {
        if (selectOnMount) {
          event.target?.select();
        }
      },
      [selectOnMount],
    );

    const onKeyDown = useCallback(
      (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (specialKeys.includes(event.key)) {
          event.preventDefault();
          onSpecialKey(event);
        }
      },
      [specialKeys, onSpecialKey],
    );

    const onChange = useCallback(
      (e) => {
        onInputValueChange(e.target.value);
      },
      [onInputValueChange],
    );

    return (
      <div
        className={cx(
          'B-ui-components_universal-palette-input-wrapper',
          className,
        )}
        style={{ display: 'flex' }}
      >
        {leftNode && (
          <div className="B-ui-components_left-node">
            <span className="w-5 h-5">{leftNode}</span>
          </div>
        )}
        <Input
          ref={ref}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          onFocus={onFocus}
          autoCapitalize={false}
          spellCheck={false}
          autoCorrect={false}
          label="Palette Input"
          className="B-ui-components_universal-palette-input w-full"
          value={inputValue}
          onChange={onChange}
        />
      </div>
    );
  },
);
