import type { Placement } from '@popperjs/core';
import { useButton } from '@react-aria/button';
import { useHover } from '@react-aria/interactions';
import { mergeProps } from '@react-aria/utils';
import React, { ReactNode, useRef } from 'react';
import reactDOM from 'react-dom';

import { BaseButton, BaseButtonProps, StylingProps } from './BaseButton';
import { useTooltipPositioner } from './use-positioner';

export function ActionButton({
  id,
  ariaLabel,
  children,
  variant,
  className = '',
  isActive, // adds an `is-active` class that can be used for extra styling
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
  allowFocus = true,
  autoFocus,
}: {
  id?: string;
  allowFocus?: boolean;
  autoFocus?: boolean;
  variant?: 'primary' | 'secondary';
  ariaLabel: string;
  children: ReactNode;
  className?: string;
  isQuiet?: BaseButtonProps['isQuiet'];
  isActive?: boolean;
  isDisabled?: boolean;
  onPress: () => void;
  style?: React.CSSProperties;
  styling?: StylingProps;
  tooltip?: ReactNode;
  tooltipDelay?: number;
  tooltipXOffset?: number;
  tooltipYOffset?: number;
  tooltipPlacement?: Placement;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const { hoverProps, isHovered } = useHover({ isDisabled });

  const { buttonProps, isPressed } = useButton(
    { 'aria-label': ariaLabel, onPress, isDisabled },
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
        allowFocus={allowFocus}
        autoFocus={autoFocus}
        onElementReady={setTriggerElement}
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
