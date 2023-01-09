import { FocusRing } from '@react-aria/focus';
import React from 'react';

import { cx } from '@bangle.io/utils';

export const Input = React.forwardRef<
  HTMLInputElement,
  {
    style?: any;
    showClear?: boolean;
    onClear?: (e: React.MouseEvent<HTMLButtonElement>) => void;
    className?: string;
    value?: string;
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
    let valueLength = 0;

    // The following if else exists for cases we want to use uncontrolled
    // input component i.e. `value` prop will be undefined
    if (value) {
      valueLength = value.length;
    } else if (ref && typeof ref !== 'function' && ref.current?.value) {
      valueLength = ref.current?.value.length;
    }

    return (
      <div className="B-ui-components_input-container">
        <FocusRing focusClass="B-ui-components_misc-input-ring">
          <input
            onKeyDown={onKeyDown}
            aria-label={label}
            type="text"
            onChange={onChange}
            ref={ref}
            className={cx(
              'outline-offset-1 text-field-neutral border-1 border-colorNeutralTextFieldBorder rounded px-2 py-1',
              className,
            )}
            style={style}
            value={value}
            placeholder={placeholder}
            onFocus={onFocus}
            autoCapitalize={autoCapitalize ? 'on' : 'off'}
            autoCorrect={autoCorrect ? 'on' : 'off'}
            spellCheck={spellCheck}
          />
        </FocusRing>
        <div style={{ position: 'relative', display: 'flex' }}>
          {showClear && valueLength > 0 && (
            <button
              className="B-ui-components_input-clear"
              aria-label="Clear search"
              onMouseDown={onClear}
            />
          )}
        </div>
      </div>
    );
  },
);
