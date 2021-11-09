import { Placement } from '@popperjs/core';
import { useToggleButton } from '@react-aria/button';
import { FocusScope } from '@react-aria/focus';
import { useFocus, useHover } from '@react-aria/interactions';
import { useMenu, useMenuItem } from '@react-aria/menu';
import { mergeProps } from '@react-aria/utils';
import { useToggleState } from '@react-stately/toggle';
import { useTreeState } from '@react-stately/tree';
import React, { ReactNode, useCallback, useEffect, useRef } from 'react';

import { cx, useKeybindings, useWatchClickOutside } from '@bangle.io/utils';

import { BaseButton, StylingProps } from './BaseButton';
import { useTooltipPositioner } from './use-positioner';

export { Item as MenuItem } from '@react-stately/collections';

export function DropdownMenu({
  ariaLabel,
  className = '',
  isDisabled,
  buttonChildren,
  children,
  buttonClassName = '',
  menuXOffset = 5,
  menuYOffset = 5,
  menuPlacement = 'bottom',
  style = {},
  buttonStyling = {},
  onAction,
}: {
  ariaLabel: string;
  buttonChildren: ReactNode;
  className?: string;
  isDisabled?: boolean;
  children?: JSX.Element[];
  menuXOffset?: number;
  menuYOffset?: number;
  menuPlacement?: Placement;
  style?: React.CSSProperties;
  buttonStyling?: StylingProps;
  onAction: (key: React.Key) => void;
  buttonClassName?: string;
}) {
  const buttonRef = useRef<any>(null);

  let state = useToggleState({});
  let { buttonProps, isPressed } = useToggleButton(
    { 'aria-label': ariaLabel },
    state,
    buttonRef,
  );

  const { hoverProps, isHovered } = useHover({ isDisabled });

  const mergedProps = mergeProps(buttonProps, hoverProps);

  const {
    isTooltipVisible,
    tooltipProps,
    setTooltipElement,
    setTriggerElement,
    triggerElement,
  } = useTooltipPositioner({
    isActive: state.isSelected,
    placement: menuPlacement,
    xOffset: menuXOffset,
    yOffset: menuYOffset,
  });

  useEffect(() => {
    buttonRef.current = triggerElement;
  }, [triggerElement]);

  const onClose = useCallback(() => {
    state.setSelected(false);
  }, [state]);

  return (
    <>
      <BaseButton
        {...mergedProps}
        className={buttonClassName}
        styling={buttonStyling}
        isActive={state.isSelected}
        isDisabled={isDisabled}
        isHovered={isHovered}
        isPressed={isPressed}
        onElementReady={setTriggerElement}
        style={{ ...style, ...((mergedProps as any).style || {}) }}
      >
        {buttonChildren}
      </BaseButton>
      {children && isTooltipVisible && (
        <div
          ref={setTooltipElement}
          style={tooltipProps.style}
          {...tooltipProps.attributes}
        >
          <FocusScope autoFocus>
            <InternalDropdownMenu
              ariaLabel={ariaLabel}
              onAction={onAction}
              domProps={{}}
              onClose={onClose}
              className={className}
            >
              {children}
            </InternalDropdownMenu>
          </FocusScope>
        </div>
      )}
    </>
  );
}

function InternalDropdownMenu({
  ariaLabel,
  onAction,
  domProps,
  children,
  onClose,
  className,
}: {
  ariaLabel: string;
  className?: string;
  onAction: (key: React.Key) => void;
  onClose: () => void;
  domProps: { [key: string]: any };
  children: JSX.Element[];
}) {
  useKeybindings(() => {
    return {
      Escape: () => {
        onClose();
        return true;
      },
    };
  }, [onClose]);

  // Create menu state based on the incoming props
  let state = useTreeState({ children, selectionMode: 'none' });

  // Get props for the menu element
  let ref = React.useRef<HTMLUListElement>(null);

  useWatchClickOutside(
    ref,
    useCallback(() => {
      onClose();
    }, [onClose]),
    useCallback(() => {}, []),
  );

  let { menuProps } = useMenu(
    { children, 'aria-label': ariaLabel },
    state,
    ref,
  );

  return (
    <ul
      {...mergeProps(menuProps, domProps)}
      ref={ref}
      className={cx(
        'flex flex-col ui-bangle-button_dropdown-menu p-1 py-2 shadow-lg rounded-md',
        className,
      )}
    >
      {[...state.collection].map((item) => (
        <MenuItemWrapper
          key={item.key}
          item={item}
          state={state}
          onAction={onAction}
          onClose={onClose}
        />
      ))}
    </ul>
  );
}

function MenuItemWrapper({ item, state, onAction, onClose }) {
  // Get props for the menu item element
  let ref = React.useRef<HTMLLIElement>(null);
  let { menuItemProps } = useMenuItem(
    {
      key: item.key,
      isDisabled: item.isDisabled,
      onAction,
      onClose,
    },
    state,
    ref,
  );

  // Handle focus events so we can apply highlighted
  // style to the focused menu item
  let [isFocused, setFocused] = React.useState(false);
  let { focusProps } = useFocus({ onFocusChange: setFocused });

  return (
    <li
      {...mergeProps(menuItemProps, focusProps)}
      ref={ref}
      className={cx(
        'ui-bangle-button_dropdown-menu-item outline-none cursor-pointer rounded-md px-2 py-1',
        isFocused && 'is-focused',
      )}
    >
      {item.rendered}
    </li>
  );
}
