import React, { useCallback, useRef, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Input } from '../Input';

export const PaletteInput = React.forwardRef(function PaletteInput(
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
) {
  useEffect(() => {
    ref?.current?.focus();
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
    (event) => {
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
      className={
        'universal-palette-input-wrapper ' + (className ? className : '')
      }
      style={{ display: 'flex' }}
    >
      {leftNode && (
        <div className="b-left-node">
          <span className="h-5 w-5">{leftNode}</span>
        </div>
      )}
      <Input
        ref={ref}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        onFocus={onFocus}
        autoCapitalize="off"
        spellCheck="false"
        autoCorrect="off"
        aria-label="universal-palette-input"
        className={'universal-palette-input'}
        value={inputValue}
        onChange={onChange}
      />
    </div>
  );
});

PaletteInput.propTypes = {
  onSpecialKey: PropTypes.func.isRequired,
  specialKeys: PropTypes.arrayOf(PropTypes.string).isRequired,
  inputValue: PropTypes.string.isRequired,
  className: PropTypes.string,
  onInputValueChange: PropTypes.func.isRequired,
};
