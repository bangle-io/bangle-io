import type { Placement } from '@popperjs/core';
import { useButton } from '@react-aria/button';
import { useHover } from '@react-aria/interactions';
import { mergeProps } from '@react-aria/utils';
import React, { ReactNode, useRef } from 'react';

import { BaseButton, StylingProps } from './BaseButton';
import { useTooltipPositioner } from './use-positioner';

export function Button({
  ariaLabel,
  children,
  className = '',
  isActive,
  isDisabled,
  onPress,
  style = {},
  styling = {},
  tooltip,
  tooltipDelay = 300,
  tooltipXOffset = 5,
  tooltipYOffset = 0,
  tooltipPlacement = 'bottom',
}: {
  ariaLabel: string;
  children: ReactNode;
  className?: string;
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
      {tooltip && isTooltipVisible && (
        <div
          ref={setTooltipElement}
          style={tooltipProps.style}
          {...tooltipProps.attributes}
        >
          {tooltip}
        </div>
      )}
    </>
  );
}
