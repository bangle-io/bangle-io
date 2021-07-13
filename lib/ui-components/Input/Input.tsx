import React from 'react';

export const Input = React.forwardRef<
  HTMLInputElement,
  {
    style?: any;
    showClear?: boolean;
    onClear?: (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
    className?: string;
    value: string;
    label?: string;
    onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    autoCapitalize?: boolean;
    spellCheck?: boolean;
    autoCorrect?: boolean;
  }
>(
  (
    {
      style,
      showClear = false,
      onClear,
      className = '',
      value,
      label,
      onFocus,
      onKeyDown,
      onChange,
      placeholder,
      autoCapitalize,
      spellCheck,
      autoCorrect,
    },
    ref,
  ) => {
    return (
      <div className="bangle-input-container">
        <input
          onKeyDown={onKeyDown}
          aria-label={label}
          type="text"
          onChange={onChange}
          ref={ref}
          className={'bangle-input ' + className}
          style={style}
          value={value}
          placeholder={placeholder}
          onFocus={onFocus}
          autoCapitalize={autoCapitalize ? 'on' : 'off'}
          autoCorrect={autoCorrect ? 'on' : 'off'}
          spellCheck={spellCheck}
        />
        <div style={{ position: 'relative', display: 'flex' }}>
          {showClear && value?.length > 0 && (
            <button
              className="bangle-search-clear"
              aria-label="Clear search"
              onMouseDown={onClear}
            />
          )}
        </div>
      </div>
    );
  },
);
