import type { Placement } from '@popperjs/core';
import { useToggleButton } from '@react-aria/button';
import { FocusScope, useFocusRing } from '@react-aria/focus';
import { useFocus, useHover } from '@react-aria/interactions';
import { useMenu, useMenuItem, useMenuSection } from '@react-aria/menu';
import { useSeparator } from '@react-aria/separator';
import { mergeProps } from '@react-aria/utils';
import { useToggleState } from '@react-stately/toggle';
import type { TreeProps, TreeState } from '@react-stately/tree';
import { useTreeState } from '@react-stately/tree';
import type { Node } from '@react-types/shared';
import type { ReactNode } from 'react';
import React, { useCallback, useEffect, useRef } from 'react';
import reactDOM from 'react-dom';

import type { Tone } from '@bangle.io/constants';
import { TONE } from '@bangle.io/constants';
import {
  cx,
  isTouchDevice,
  useKeybindings,
  useWatchClickOutside,
} from '@bangle.io/utils';

import type { BaseButtonStyleProps, ButtonVariant } from '../Button';
import { BUTTON_VARIANT, useButtonStyleProps } from '../Button';
import { useTooltipPositioner } from './use-positioner';

export {
  Item as MenuItem,
  Section as MenuSection,
} from '@react-stately/collections';

interface DropdownButtonProps {
  animateOnPress?: boolean;
  ariaLabel?: string;
  autoFocus?: boolean;
  className?: string;
  // do not fill in the set the width and height (w-X and h-X)
  // use size instead
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  size?: BaseButtonStyleProps['size'];
  style?: React.CSSProperties;
  text?: ReactNode;
  tone?: Tone;
  variant?: ButtonVariant;
  onHoverStyle?: React.CSSProperties;
  onPressStyle?: React.CSSProperties;
}

interface DropdownMenuProps {
  ariaLabel?: string;
  className?: string;
  placement?: Placement;
  xOffset?: number;
  yOffset?: number;
  style?: React.CSSProperties;
}

export function DropdownMenu({
  buttonProps: dropdownButtonProps,
  children,
  disabledKeys,
  isDisabled = false,
  isTouch = isTouchDevice,
  menuProps: dropdownMenuProps = {},
  onAction,
  onSelectedChange,
}: {
  buttonProps: DropdownButtonProps;
  children?: JSX.Element | JSX.Element[];
  disabledKeys?: TreeProps<typeof children>['disabledKeys'];
  isDisabled?: boolean;
  isTouch?: boolean;
  menuProps?: DropdownMenuProps;
  onAction: (key: React.Key) => void;
  onSelectedChange?: (isSelected: boolean) => void;
}) {
  const buttonRef = useRef<any>(null);
  const toggleState = useToggleState({ onChange: onSelectedChange });
  const { buttonProps, isPressed: isButtonPressed } = useToggleButton(
    {
      'aria-label': dropdownButtonProps.ariaLabel,
      isDisabled,
      'autoFocus': dropdownButtonProps.autoFocus,
    },
    toggleState,
    buttonRef,
  );

  const { hoverProps: buttonHoverProps, isHovered: isButtonHovered } = useHover(
    { isDisabled },
  );

  const { isFocusVisible: buttonIsFocusVisible, focusProps: buttonFocusProps } =
    useFocusRing({
      autoFocus: dropdownButtonProps.autoFocus,
    });

  const mergedButtonProps = mergeProps(
    buttonProps,
    buttonHoverProps,
    buttonFocusProps,
  );

  const {
    isTooltipVisible,
    tooltipProps,
    setTooltipElement,
    setTriggerElement,
    triggerElement,
  } = useTooltipPositioner({
    isActive: toggleState.isSelected,
    placement: dropdownMenuProps.placement ?? 'bottom',
    xOffset: dropdownMenuProps.xOffset ?? 5,
    yOffset: dropdownMenuProps.yOffset ?? 5,
  });

  useEffect(() => {
    buttonRef.current = triggerElement;
  }, [triggerElement]);

  const onClose = useCallback(() => {
    toggleState.setSelected(false);
  }, [toggleState]);

  useEffect(() => {
    if (isDisabled && toggleState.isSelected) {
      toggleState.setSelected(false);
    }
  }, [isDisabled, toggleState]);

  const buttonElProps = useButtonStyleProps({
    elementProps: mergedButtonProps,
    leftIcon: dropdownButtonProps.leftIcon,
    rightIcon: dropdownButtonProps.rightIcon,
    text: dropdownButtonProps.text,
    styleProps: {
      animateOnPress: dropdownButtonProps.animateOnPress ?? true,
      className: dropdownButtonProps.className,
      isDisabled: isDisabled,
      isFocusVisible: buttonIsFocusVisible,
      isHovered: isButtonHovered,
      isPressed: isButtonPressed,
      isTouch,
      size: dropdownButtonProps.size ?? 'md',
      tone: dropdownButtonProps.tone ?? TONE.NEUTRAL,
      style: dropdownButtonProps.style,
      variant: dropdownButtonProps.variant ?? BUTTON_VARIANT.SOLID,
      onHoverStyle: dropdownButtonProps.onHoverStyle,
      onPressStyle: dropdownButtonProps.onPressStyle,
    },
  });

  return (
    <>
      <button ref={setTriggerElement} {...buttonElProps} />
      {children &&
        isTooltipVisible &&
        reactDOM.createPortal(
          <div
            ref={setTooltipElement}
            style={tooltipProps.style}
            {...tooltipProps.attributes}
          >
            <FocusScope autoFocus>
              <InternalDropdownMenu
                ariaLabel={dropdownMenuProps.ariaLabel ?? 'Dropdown Menu'}
                onAction={onAction}
                onClose={onClose}
                disabledKeys={disabledKeys}
                className={dropdownMenuProps.className}
                style={dropdownMenuProps.style}
              >
                {children}
              </InternalDropdownMenu>
            </FocusScope>
          </div>,
          document.getElementById('tooltip-container')!,
        )}
    </>
  );
}

function InternalDropdownMenu({
  ariaLabel,
  onAction,
  children,
  onClose,
  className,
  style,
  disabledKeys,
}: {
  disabledKeys?: TreeProps<typeof children>['disabledKeys'];
  ariaLabel: string;
  className?: string;
  onAction: (key: React.Key) => void;
  onClose: () => void;
  children: JSX.Element[] | JSX.Element;
  style?: React.CSSProperties;
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
  let state = useTreeState({
    children: children,
    selectionMode: 'none',
    disabledKeys,
  });

  // Get props for the menu element
  let ref = React.useRef<HTMLUListElement>(null);

  useWatchClickOutside(
    ref,
    useCallback(() => {
      onClose();
    }, [onClose]),
    useCallback(() => {}, []),
  );

  let { menuProps } = useMenu({ 'aria-label': ariaLabel }, state, ref);

  return (
    <ul
      {...menuProps}
      ref={ref}
      className={cx(
        'flex flex-col min-w-72 z-dropdown shadow-md  bg-colorBgLayerFloat border-neutral p-1 py-2 rounded',
        className,
      )}
      style={style}
    >
      {[...state.collection].map((section) => (
        <MenuItemSection
          key={section.key}
          section={section}
          state={state}
          onAction={onAction}
          onClose={onClose}
        />
      ))}
    </ul>
  );
}

function MenuItemSection({
  section,
  state,
  onAction,
  onClose,
}: {
  onAction: (key: React.Key) => void;
  state: TreeState<object>;
  section: Node<object>;
  onClose: () => void;
}) {
  let { itemProps, headingProps, groupProps } = useMenuSection({
    'heading': section.rendered,
    'aria-label': section['aria-label'],
  });

  let { separatorProps } = useSeparator({
    elementType: 'li',
  });

  // If the section is not the first, add a separator element.
  // The heading is rendered inside an <li> element, which contains
  // a <ul> with the child items.
  return (
    <>
      {section.key !== state.collection.getFirstKey() && (
        <li
          {...separatorProps}
          className="mx-1 my-2 border-t-1 border-colorNeutralBorder"
        />
      )}
      <li {...itemProps}>
        {section.rendered && (
          <span {...headingProps} className="font-bold">
            {section.rendered}
          </span>
        )}
        <ul {...groupProps} className="p-0 list-outside">
          {[...section.childNodes].map((node) => (
            <MenuItemWrapper
              key={node.key}
              item={node}
              state={state}
              onAction={onAction}
              onClose={onClose}
            />
          ))}
        </ul>
      </li>
    </>
  );
}

function MenuItemWrapper({
  item,
  state,
  onAction,
  onClose,
}: {
  onAction: (key: React.Key) => void;
  state: TreeState<object>;
  item: Node<object>;
  onClose: () => void;
}) {
  // Get props for the menu item element
  let ref = React.useRef<HTMLLIElement>(null);
  let isDisabled = state.disabledKeys.has(item.key);

  let { menuItemProps } = useMenuItem(
    {
      'key': item.key,
      isDisabled,
      onAction,
      onClose,
      'aria-label': item['aria-label'],
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
        'outline-none cursor-pointer text-sm rounded-md px-2 py-1',
        isFocused && 'bg-colorNeutralSolidFaint',
      )}
    >
      <span className="inline-flex justify-between w-full">
        {item.rendered}
      </span>
    </li>
  );
}
