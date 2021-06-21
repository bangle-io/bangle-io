import React, { useCallback, useRef, useEffect, useState } from 'react';
import PropTypes from 'prop-types';

export const PaletteInput = React.forwardRef(function PaletteInput(
  {
    className,
    onInputValueChange,
    inputValue,
    specialKeys,
    onSpecialKey,
    placeholder,
    leftIcon,
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
      {leftIcon && (
        <div
          className="left-icon"
          style={{
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {leftIcon}
        </div>
      )}
      <input
        type="text"
        ref={ref}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        onFocus={onFocus}
        autoCapitalize="off"
        spellCheck="false"
        autoCorrect="off"
        aria-label="universal-palette-input"
        style={{ flexGrow: 1 }}
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
