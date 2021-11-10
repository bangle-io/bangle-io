import type { Placement } from '@popperjs/core';
import { useTooltipTriggerState } from '@react-stately/tooltip';
import * as React from 'react';
import { usePopper } from 'react-popper';

/**
 * Provides tooltip positioning props
 * set `isActive` to true when you want to show the tooltip,
 * but use `isTooltipVisible` for showing the tooltip because
 * this accounts for delay and not showing any other tooltip when
 * one is active
 */
export function useTooltipPositioner({
  isActive = false,
  delay = 100,
  placement = 'bottom',
  xOffset = 0,
  yOffset = 0,
  isDisabled,
}: {
  xOffset?: number;
  yOffset?: number;
  placement?: Placement;
  isActive: boolean;
  isDisabled?: boolean;
  delay?: number;
}) {
  const [triggerElement, setTriggerElement] =
    React.useState<HTMLElement | null>(null);
  const [tooltipElement, setTooltipElement] =
    React.useState<HTMLElement | null>(null);

  const state = useTooltipTriggerState({ delay, isDisabled });

  const popperOpts: Parameters<typeof usePopper>[2] = React.useMemo(
    () => ({
      placement,
      modifiers: [{ name: 'offset', options: { offset: [yOffset, xOffset] } }],
    }),
    [placement, xOffset, yOffset],
  );

  const { styles, attributes, ...popperProps } = usePopper(
    triggerElement,
    tooltipElement,
    popperOpts,
  );

  const hideTooltip = React.useCallback(() => {
    state.close(true);
  }, [state]);

  const showTooltip = React.useCallback(() => {
    state.open(true);
  }, [state]);

  React.useEffect(() => {
    if (isActive) {
      showTooltip();
    } else if (!isActive) {
      hideTooltip();
    }
  }, [isActive, showTooltip, hideTooltip]);

  // Handle click outside
  // Trigger: focus
  // Trigger: hover on tooltip, keep it open if hovered
  // Handle closing tooltip if trigger hidden

  const isReferenceHidden =
    popperProps?.state?.modifiersData?.hide?.isReferenceHidden;
  React.useEffect(() => {
    if (isReferenceHidden) {
      hideTooltip();
    }
  }, [hideTooltip, isReferenceHidden]);

  // Tooltip props getter

  const tooltipProps = {
    style: styles.popper,
    attributes: attributes.popper,
  };

  const arrowProps = {
    style: styles.arrow,
    attributes: attributes.arrow,
  };

  return {
    isTooltipVisible: state.isOpen,
    arrowProps,
    tooltipProps,
    setTooltipElement,
    setTriggerElement,
    tooltipElement,
    triggerElement,
    ...popperProps,
  };
}
