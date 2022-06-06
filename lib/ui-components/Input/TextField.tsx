import { FocusRing } from '@react-aria/focus';
import type { AriaTextFieldOptions } from '@react-aria/textfield';
import { useTextField } from '@react-aria/textfield';
import React from 'react';

import { cx } from '@bangle.io/utils';

import type { SizeType } from '../misc';

export function TextField(
  props: AriaTextFieldOptions<'input'> & {
    size?: SizeType;
    spellCheck?: boolean;
  },
) {
  let { label, size } = props;
  let ref = React.useRef<HTMLInputElement>(null);
  let { labelProps, inputProps, descriptionProps, errorMessageProps } =
    useTextField(props, ref);

  return (
    <div
      className={cx(
        size === 'small' && 'w-40',
        size === 'medium' && 'w-56',
        size === 'large' && 'w-64',
        size === 'full' && 'w-full',
      )}
      style={{
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <label
        {...labelProps}
        className="text-sm"
        style={{
          color: 'var(--BV-text-color-1)',
        }}
      >
        {label}
      </label>
      <FocusRing focusClass="B-ui-components_misc-input-ring">
        <input
          {...inputProps}
          ref={ref}
          spellCheck={props.spellCheck === undefined ? true : props.spellCheck}
          className="outline-none"
          style={{
            color: 'var(--BV-text-color-0)',
            backgroundColor: 'var(--BV-window-bg-color-0)',
            border: '1px solid var(--BV-window-border-color-0)',
            borderRadius: '0.125rem',
            outlineOffset: 2,
            padding: '0.5rem 0.75rem',
          }}
        />
      </FocusRing>
      {props.description && (
        <div
          {...descriptionProps}
          className="text-sm"
          style={{
            color: 'var(--BV-text-color-1)',
          }}
        >
          {props.description}
        </div>
      )}
      {props.errorMessage && (
        <div
          {...errorMessageProps}
          className="text-sm"
          style={{ color: 'var(--BV-severity-error-color)' }}
        >
          {props.errorMessage}
        </div>
      )}
    </div>
  );
}
