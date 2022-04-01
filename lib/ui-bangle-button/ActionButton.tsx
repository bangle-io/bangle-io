import type { Placement } from '@popperjs/core';
import { useButton } from '@react-aria/button';
import { useHover } from '@react-aria/interactions';
import { mergeProps } from '@react-aria/utils';
import type { PressEvents } from '@react-types/shared';
import React, { MutableRefObject, ReactNode, useCallback, useRef } from 'react';
import reactDOM from 'react-dom';

import { BaseButton, BaseButtonProps, StylingProps } from './BaseButton';
import { useTooltipPositioner } from './use-positioner';

export function ActionButton({
  id,
  ariaLabel,
  children,
  variant,
  className = '',
  isActive, // adds an `BU_is-active` class that can be used for extra styling
  isDisabled,
  isQuiet, // avoids rendering the button background color
  onPress,
  style = {},
  styling = {},
  tooltip,
  tooltipDelay = 300,
  tooltipPlacement = 'bottom',
  tooltipXOffset = 5,
  tooltipYOffset = 0,
  autoFocus,
}: {
  id?: string;
  autoFocus?: boolean;
  variant?: BaseButtonProps['variant'];
  ariaLabel: string;
  children: ReactNode;
  className?: string;
  isQuiet?: BaseButtonProps['isQuiet'];
  isActive?: boolean;
  isDisabled?: boolean;
  onPress: PressEvents['onPress'];
  style?: React.CSSProperties;
  styling?: StylingProps;
  tooltip?: ReactNode;
  tooltipDelay?: number;
  tooltipXOffset?: number;
  tooltipYOffset?: number;
  tooltipPlacement?: Placement;
}) {
  // Because tooltip doesn't use the vanilla `useRef` and aria uses that
  // we have to override the type and also manually set the buttonElement
  // to current.
  const ref: MutableRefObject<HTMLButtonElement | null> = useRef(null);
  const { hoverProps, isHovered } = useHover({ isDisabled });

  const { buttonProps, isPressed } = useButton(
    { 'aria-label': ariaLabel, onPress, isDisabled, autoFocus },
    ref,
  );

  const {
    isTooltipVisible,
    setTooltipElement,
    setTriggerElement,
    tooltipProps,
  } = useTooltipPositioner({
    isActive: isHovered,
    xOffset: tooltipXOffset,
    yOffset: tooltipYOffset,
    delay: tooltipDelay,
    placement: tooltipPlacement,
  });
  const mergedProps: any = mergeProps(buttonProps, hoverProps);

  const setButtonElement = useCallback(
    (el) => {
      setTriggerElement(el);
      ref.current = el;
    },
    [setTriggerElement],
  );

  return (
    <>
      <BaseButton
        {...mergedProps}
        id={id}
        variant={variant}
        styling={styling}
        isQuiet={isQuiet}
        className={className}
        isActive={isActive}
        isDisabled={isDisabled}
        isHovered={isHovered}
        isPressed={isPressed}
        autoFocus={autoFocus}
        onElementReady={setButtonElement}
        style={{ ...style, ...buttonProps.style, ...hoverProps.style }}
      >
        {children}
      </BaseButton>
      {tooltip &&
        isTooltipVisible &&
        reactDOM.createPortal(
          <div
            ref={setTooltipElement}
            style={tooltipProps.style}
            {...tooltipProps.attributes}
          >
            {tooltip}
          </div>,
          document.getElementById('tooltip-container')!,
        )}
    </>
  );
}
