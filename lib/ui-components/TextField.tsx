import { FocusRing } from '@react-aria/focus';
import type { AriaTextFieldOptions } from '@react-aria/textfield';
import { useTextField } from '@react-aria/textfield';
import React from 'react';

import { vars } from '@bangle.io/css-vars';

import { FieldLabel } from './FieldLabel';

export function TextField(
  props: AriaTextFieldOptions<'input'> & {
    spellCheck?: boolean;
    className?: string;
  },
) {
  let { label } = props;
  let ref = React.useRef<HTMLInputElement>(null);
  let { labelProps, inputProps, descriptionProps, errorMessageProps } =
    useTextField(props, ref);

  return (
    <div
      className={props.className}
      style={{
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <FieldLabel label={label} labelProps={labelProps} />
      <FocusRing focusClass="B-ui-components_misc-input-ring">
        <input
          {...inputProps}
          ref={ref}
          spellCheck={props.spellCheck === undefined ? true : props.spellCheck}
          className="outline-none text-field-neutral border-1 border-colorNeutralTextFieldBorder rounded px-2 py-2"
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
