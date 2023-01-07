import { ChevronDownIcon } from '@heroicons/react/solid';
import { useButton } from '@react-aria/button';
import { useComboBox } from '@react-aria/combobox';
import { useFilter } from '@react-aria/i18n';
import { useComboBoxState } from '@react-stately/combobox';
import type { ComboBoxProps } from '@react-types/combobox';
import * as React from 'react';

import { cx } from '@bangle.io/utils';

import type { SizeType } from '../misc';
import { ListBox } from '../Select/ListBox';
import { Popover } from '../Select/Popover';

export function ComboBox<T extends object>(
  props: ComboBoxProps<T> & { size?: SizeType },
) {
  let { contains } = useFilter({ sensitivity: 'base' });
  let state = useComboBoxState({ ...props, defaultFilter: contains });

  let buttonRef = React.useRef(null);
  let inputRef = React.useRef(null);
  let listBoxRef = React.useRef(null);
  let popoverRef = React.useRef(null);

  let {
    buttonProps: triggerProps,
    inputProps,
    listBoxProps,
    labelProps,
  } = useComboBox(
    {
      ...props,
      inputRef,
      buttonRef,
      listBoxRef,
      popoverRef,
    },
    state,
  );

  let { buttonProps } = useButton(triggerProps, buttonRef);
  const { size = 'medium' } = props;

  return (
    <div
      className={cx(
        'B-ui-components_combo-box flex flex-col relative',
        size === 'small' && 'w-40',
        size === 'medium' && 'w-56',
        size === 'large' && 'w-64',
        size === 'full' && 'w-full',
      )}
    >
      <label
        {...labelProps}
        className="block select-none text-sm font-medium text-left text-colorNeutralTextSubdued"
      >
        {props.label}
      </label>
      <div
        className={cx(
          `relative inline-flex flex-row rounded-md overflow-hidden`,
          `text-field-neutral px-1 py-1 border-neutral rounded`,
          state.isFocused && 'B-ui-components_misc-input-ring',
        )}
      >
        <input
          {...inputProps}
          ref={inputRef}
          className={cx('w-full outline-none px-2 py-1 text-field-neutral')}
        />
        <button
          {...buttonProps}
          ref={buttonRef}
          className={`px-1 cursor-pointer`}
        >
          <ChevronDownIcon
            className="w-5 h-5"
            aria-hidden="true"
            style={{
              color: 'var(--BV-ui-bangle-button-color)',
            }}
          />
        </button>
      </div>
      {state.isOpen && (
        <Popover
          popoverRef={popoverRef}
          isOpen={state.isOpen}
          onClose={state.close}
        >
          <ListBox
            className="max-h-72 overflow-auto border-neutral bg-colorNeutralTextFieldBg text-colorNeutralTextFieldText rounded"
            {...listBoxProps}
            listBoxRef={listBoxRef}
            state={state}
          />
        </Popover>
      )}
    </div>
  );
}
