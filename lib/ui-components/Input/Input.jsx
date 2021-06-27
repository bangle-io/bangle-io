import React from 'react';

export const Input = React.forwardRef(
  (
    {
      style,
      showClear = false,
      onClear,
      className = '',
      value,
      label,
      ...props
    },
    ref,
  ) => {
    return (
      <div className="bangle-input-container">
        <input
          aria-label={label}
          type="text"
          ref={ref}
          className={'bangle-input ' + className}
          style={style}
          value={value}
          {...props}
        />
        <div style={{ position: 'relative', display: 'flex' }}>
          {showClear && value?.length > 0 && (
            <div
              className="bangle-search-clear"
              aria-label="Clear"
              onMouseDown={onClear}
            />
          )}
        </div>
      </div>
    );
  },
);
