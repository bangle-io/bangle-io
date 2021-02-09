import React, { useEffect, useRef, useState } from 'react';

const PADDING_OFFSET = 16;
const BASE_PADDING = 16;

export function SideBarRow({
  title,
  isActive,
  onClick,
  rightIcon,
  leftIcon,
  basePadding = BASE_PADDING,
  depth = 1,
  children,
  className,
  scrollIntoViewIfNeeded = true,
  style = {},
}) {
  const ref = useRef(null);

  useEffect(() => {
    if (scrollIntoViewIfNeeded && isActive) {
      if ('scrollIntoViewIfNeeded' in document.body) {
        ref.current.scrollIntoViewIfNeeded(false);
      } else {
        ref.current.scrollIntoView(false);
      }
    }
  }, [scrollIntoViewIfNeeded, isActive]);
  return (
    <>
      <div
        onClick={onClick}
        ref={ref}
        className={`flex side-bar-row flex-row items-center cursor-pointer ${className} ${
          isActive ? `active` : ''
        }`}
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
      </div>
      {children}
    </>
  );
}

export function CollapsibleSideBarRow({
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
    <SideBarRow
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
    </SideBarRow>
  );
}
