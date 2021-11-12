import type { Placement } from '@popperjs/core';
import { useButton } from '@react-aria/button';
import { useHover } from '@react-aria/interactions';
import { mergeProps } from '@react-aria/utils';
import React, { ReactNode, useRef } from 'react';
import reactDOM from 'react-dom';

import { BaseButton, BaseButtonProps, StylingProps } from './BaseButton';
import { useTooltipPositioner } from './use-positioner';

if (typeof window !== undefined) {
  if (!document.getElementById('tooltip-container')) {
    throw new Error('element with id tooltip-container needs to exist');
  }
}

export function ActionButton({
  ariaLabel,
  children,
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
}: {
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
        styling={styling}
        isQuiet={isQuiet}
        className={className}
        isActive={isActive}
        isDisabled={isDisabled}
        isHovered={isHovered}
        isPressed={isPressed}
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
