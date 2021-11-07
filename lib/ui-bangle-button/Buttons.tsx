import { useButton } from '@react-aria/button';
import { useHover } from '@react-aria/interactions';
import { AriaPositionProps, useOverlayPosition } from '@react-aria/overlays';
import { useTooltip } from '@react-aria/tooltip';
import { mergeProps } from '@react-aria/utils';
import { useTooltipTriggerState } from '@react-stately/tooltip';
import React, { ReactNode, useEffect, useRef } from 'react';

import { cx } from '@bangle.io/utils';

export function Button({
  activeColor = 'var(--uiBangleButton-active-color)',
  animateOnPress = false,
  ariaLabel,
  bgOnHover = false,
  children,
  className,
  color = 'var(--uiBangleButton-color)',
  hoverBgColor = 'var(--uiBangleButton-hover-bgColor)',
  hoverColor = 'var(--uiBangleButton-hover-color)',
  isActive,
  isDisabled,
  isRounded = false,
  onPress,
  pressedBgColor = 'var(--uiBangleButton-pressed-bgColor)',
  style = {},
  tooltip,
  tooltipDelay = 300,
  tooltipOffset = 10,
  tooltipPlacement = 'bottom',
}: {
  activeColor?: string;
  animateOnPress?: boolean;
  ariaLabel: string;
  bgOnHover?: boolean;
  children: ReactNode;
  className?: string;
  color?: string;
  hoverBgColor?: string;
  hoverColor?: string;
  isActive?: boolean;
  isDisabled?: boolean;
  isRounded?: boolean;
  onPress: () => void;
  pressedBgColor?: string;
  style?: React.CSSProperties;
  tooltip?: ReactNode;
  tooltipDelay?: number;
  tooltipOffset?: number;
  tooltipPlacement?: AriaPositionProps['placement'];
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const tooltipOverlayRef = React.useRef<HTMLDivElement>(null);
  const { hoverProps, isHovered } = useHover({ isDisabled });

  // tooltip
  const tooltipState = useTooltipTriggerState({ delay: tooltipDelay });
  const { tooltipProps } = useTooltip({}, tooltipState);
  useEffect(() => {
    if (tooltip) {
      if (isHovered && !tooltipState.isOpen) {
        tooltipState.open();
      } else if (!isHovered && tooltipState.isOpen) {
        tooltipState.close(true);
      }
    }
  }, [tooltip, tooltipState, isHovered]);

  const { overlayProps: tooltipPositionProps } = useOverlayPosition({
    targetRef: ref,
    overlayRef: tooltipOverlayRef,
    placement: tooltipPlacement,
    offset: tooltipOffset,
    isOpen: tooltipState.isOpen,
  });
  // tooltip overlay-end

  const { buttonProps, isPressed } = useButton(
    { 'aria-label': ariaLabel, onPress, isDisabled },
    ref,
  );

  style = { ...style };
  style.color = color;
  if (isActive) {
    style.color = activeColor;
  }

  if (isHovered) {
    style.color = hoverColor;
    if (bgOnHover) {
      style.backgroundColor = hoverBgColor;
    }
  }

  if (animateOnPress && isPressed) {
    style.backgroundColor = pressedBgColor;
    style.transform = 'scale(var(--uiBangleButton-depression))';
  }

  if (isRounded) {
    style.borderRadius = 'var(--uiBangleButton-radius)';
  }

  return (
    <>
      <button
        {...mergeProps(buttonProps, hoverProps)}
        className={cx(
          'ui-bangle-button_button p-1 ',
          'transition-all duration-200',
          animateOnPress && 'animate-on-press',
          className,
          isActive && 'is-active',
          isDisabled && 'is-disabled',
          isDisabled && 'cursor-not-allowed',
          isHovered && 'is-hovered',
          isPressed && 'is-pressed',
          isHovered && bgOnHover && 'bg-on-hover',
        )}
        style={style}
        ref={ref}
      >
        {children}
      </button>
      {tooltip && tooltipState.isOpen && (
        <div
          ref={tooltipOverlayRef}
          {...mergeProps(tooltipProps, tooltipPositionProps)}
        >
          {tooltip}
        </div>
      )}
    </>
  );
}
