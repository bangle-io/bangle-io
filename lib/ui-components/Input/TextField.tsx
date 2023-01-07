import { FocusRing } from '@react-aria/focus';
import type { AriaTextFieldOptions } from '@react-aria/textfield';
import { useTextField } from '@react-aria/textfield';
import React from 'react';

import { vars } from '@bangle.io/atomic-css';
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
      <label {...labelProps} className="text-sm text-colorNeutralTextSubdued">
        {label}
      </label>
      <FocusRing focusClass="B-ui-components_misc-input-ring">
        <input
          {...inputProps}
          ref={ref}
          spellCheck={props.spellCheck === undefined ? true : props.spellCheck}
          className="outline-none text-field-neutral border-neutral rounded px-2 py-2"
          style={{}}
        />
      </FocusRing>
      {props.description && (
        <div
          {...descriptionProps}
          className="text-sm text-colorNeutralTextSubdued"
        >
          {props.description}
        </div>
      )}
      {props.errorMessage && (
        <div
          {...errorMessageProps}
          className="text-sm"
          style={{ color: vars.color.critical.solidStrong }}
        >
          {props.errorMessage}
        </div>
      )}
    </div>
  );
}
