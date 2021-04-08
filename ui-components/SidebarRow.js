import './SidebarRow.css';
import React, { useCallback, useEffect, useRef, useState } from 'react';

const PADDING_OFFSET = 16;
const BASE_PADDING = 16;

export function SidebarRow({
  title,
  isActive,
  onClick,
  rightIcon,
  rightHoverIcon = null,
  leftIcon,
  basePadding = BASE_PADDING,
  depth = 1,
  children,
  className = '',
  scrollIntoViewIfNeeded = true,
  style = {},
}) {
  const ref = useRef(null);

  const [isHovered, setHover] = useState(false);

  useEffect(() => {
    if (scrollIntoViewIfNeeded && isActive) {
      if ('scrollIntoViewIfNeeded' in document.body) {
        ref.current.scrollIntoViewIfNeeded(false);
      } else {
        if (ref.current.scrollIntoView) {
          ref.current.scrollIntoView(false);
        }
      }
    }
  }, [scrollIntoViewIfNeeded, isActive]);

  const mouseEnter = useCallback(() => {
    setHover(true);
  }, []);

  const mouseLeave = useCallback(() => {
    setHover(false);
  }, []);

  return (
    <>
      <div
        onClick={onClick}
        onMouseEnter={mouseEnter}
        onMouseLeave={mouseLeave}
        ref={ref}
        className={`flex side-bar-row flex-row items-center cursor-pointer ${className} ${
          isActive ? `active` : ''
        } ${isHovered ? 'hover' : ''}`}
        style={{
          paddingLeft: depth * basePadding,
          paddingRight: PADDING_OFFSET,
          ...style,
        }}
      >
        {leftIcon}
        <span className="text-lg truncate select-none">{title}</span>
        <span className="flex-1 flex "></span>
        {rightIcon}
        {isHovered ? rightHoverIcon : null}
      </div>
      {children}
    </>
  );
}

export function CollapsibleSidebarRow({
  children,
  onClick,
  activeLeftIcon,
  leftIcon,
  initialCollapse = false,
  isSticky = false,
  ...props
}) {
  const [collapsed, toggleCollapse] = useState(initialCollapse);

  leftIcon = collapsed ? activeLeftIcon : leftIcon;
  let className = isSticky ? 'sticky top-0' : '';
  className += collapsed ? ' collapsed ' : '';
  return (
    <SidebarRow
      {...props}
      className={className}
      leftIcon={leftIcon}
      onClick={() => {
        toggleCollapse(!collapsed);
        if (onClick) {
          onClick();
        }
      }}
    >
      {collapsed ? null : children}
    </SidebarRow>
  );
}
