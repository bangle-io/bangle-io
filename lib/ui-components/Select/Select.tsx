import { SelectorIcon } from '@heroicons/react/solid';
import { useButton } from '@react-aria/button';
import { useFocusRing } from '@react-aria/focus';
import { useHover } from '@react-aria/interactions';
import { HiddenSelect, useSelect } from '@react-aria/select';
import { mergeProps } from '@react-aria/utils';
import { useSelectState } from '@react-stately/select';
import type { AriaSelectProps } from '@react-types/select';
import React from 'react';

import { cx } from '@bangle.io/utils';

import type { SizeType } from '../misc';
import { ListBox } from './ListBox';
import { Popover } from './Popover';

export function Select<T extends object>(
  props: AriaSelectProps<T> & { size?: SizeType },
) {
  // Create state based on the incoming props
  let state = useSelectState(props);

  // Get props for child elements from useSelect
  let ref = React.useRef(null);
  let { labelProps, triggerProps, valueProps, menuProps } = useSelect(
    props,
    state,
    ref,
  );

  // Get props for the button based on the trigger props from useSelect
  let { buttonProps } = useButton(triggerProps, ref);
  const { hoverProps, isHovered } = useHover({ isDisabled: props.isDisabled });

  let { focusProps, isFocusVisible } = useFocusRing();
  const { size = 'medium' } = props;

  return (
    <div
      className={cx(
        'inline-flex flex-col relative mt-4',
        size === 'small' && 'w-40',
        size === 'medium' && 'w-56',
        size === 'large' && 'w-64',
        size === 'full' && 'w-full',
      )}
    >
      <div
        {...labelProps}
        className="B-ui-components_select-label text-sm font-medium cursor-default"
      >
        {props.label}
      </div>
      <HiddenSelect
        state={state}
        triggerRef={ref}
        label={props.label}
        name={props.name}
      />
      <button
        {...mergeProps(hoverProps, buttonProps, focusProps)}
        ref={ref}
        className={cx(
          'B-ui-components_select-button',
          'p-1 relative inline-flex flex-row items-center justify-between overflow-hidden cursor-default shadow-sm outline-none',
          isFocusVisible ? 'ring-promote' : '',
        )}
        style={{
          borderRadius: 'var(--BV-ui-bangle-button-radius)',
          backgroundColor: state.isOpen
            ? 'var(--BV-ui-bangle-button-destructive-pressed-bg-color)'
            : isHovered
            ? 'var(--BV-ui-bangle-button-hover-bg-color)'
            : 'var(--BV-ui-bangle-button-bg-color)',
        }}
      >
        <span
          {...valueProps}
          className={`text-base text-left px-1 w-64 truncate overflow-ellipsis `}
          style={{
            color: state.selectedItem
              ? 'var(--BV-ui-bangle-button-hover-color)'
              : 'var(--BV-ui-bangle-button-color)',
          }}
        >
          {state.selectedItem
            ? state.selectedItem.rendered
            : 'Select an option'}
        </span>
        <SelectorIcon
          className="w-5 h-5"
          style={{
            color: 'var(--BV-ui-bangle-button-color)',
          }}
        />
      </button>
      {state.isOpen && (
        <Popover isOpen={state.isOpen} onClose={state.close}>
          <ListBox
            className="max-h-72 overflow-auto "
            {...menuProps}
            state={state}
          />
        </Popover>
      )}
    </div>
  );
}
