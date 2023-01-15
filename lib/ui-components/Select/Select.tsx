import { SelectorIcon } from '@heroicons/react/solid';
import { useButton } from '@react-aria/button';
import { useFocusRing } from '@react-aria/focus';
import { useHover } from '@react-aria/interactions';
import { HiddenSelect, useSelect } from '@react-aria/select';
import { mergeProps } from '@react-aria/utils';
import { useSelectState } from '@react-stately/select';
import type { AriaSelectProps } from '@react-types/select';
import React from 'react';

import { TONE } from '@bangle.io/constants';
import { vars } from '@bangle.io/css-vars';
import { cx, isTouchDevice } from '@bangle.io/utils';

import type { BaseButtonStyleProps } from '../Button';
import { BUTTON_VARIANT, useButtonStyleProps } from '../Button';
import { FieldLabel } from '../FieldLabel';
import { ListBox } from './ListBox';
import { Popover } from './Popover';

export function Select<T extends object>(
  props: AriaSelectProps<T> & {
    className?: string;
    size?: BaseButtonStyleProps['size'];
  },
) {
  const { size, className } = props;

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
  let { buttonProps, isPressed } = useButton(triggerProps, ref);
  const { hoverProps, isHovered } = useHover({ isDisabled: props.isDisabled });

  let { focusProps, isFocusVisible } = useFocusRing();

  const buttonElProps = useButtonStyleProps({
    elementProps: mergeProps(hoverProps, buttonProps, focusProps),
    textElementProps: valueProps,
    leftIcon: undefined,
    rightIcon: <SelectorIcon />,
    text: state.selectedItem ? state.selectedItem.rendered : 'Select an option',
    styleProps: {
      animateOnPress: false,
      className: 'B-ui-components_select-button',
      isDisabled: props.isDisabled ?? false,
      isFocusVisible: isFocusVisible,
      isHovered: isHovered,
      isPressed: isPressed,
      isTouch: isTouchDevice,
      size: size ?? 'md',
      tone: TONE.NEUTRAL,
      style: {
        // override button styles to match with text field input
        backgroundColor: vars.color.neutral.textFieldBg,
        border: `1px solid ${vars.color.neutral.textFieldBorder}`,
        color: vars.color.neutral.textFieldText,
      },
      variant: BUTTON_VARIANT.TRANSPARENT,
    },
  });

  return (
    <div className={cx(className, 'inline-flex flex-col relative mt-4')}>
      <FieldLabel label={props.label} labelProps={labelProps} />
      <HiddenSelect
        state={state}
        triggerRef={ref}
        label={props.label}
        name={props.name}
      />
      <button ref={ref} {...buttonElProps} />
      {state.isOpen && (
        <Popover isOpen={state.isOpen} onClose={state.close}>
          <ListBox
            className="max-h-72 overflow-auto"
            {...menuProps}
            state={state}
          />
        </Popover>
      )}
    </div>
  );
}
