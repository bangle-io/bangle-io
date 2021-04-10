import './SidebarRow.css';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { cx } from 'utils/index';

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
  disabled,
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
        className={cx(
          'flex side-bar-row flex-row items-center',
          disabled ? 'cursor-not-allowed' : 'cursor-pointer',
          className,
          isActive && 'active',
          isHovered && 'hover',
        )}
        style={{
          paddingLeft: depth * basePadding,
          paddingRight: PADDING_OFFSET,
          ...style,
        }}
      >
        {leftIcon}
        <span
          className={cx('text-lg truncate select-none')}
          style={{
            color: disabled ? 'var(--font-lighter-color)' : 'inherit',
          }}
        >
          {title}
        </span>
        <span className="flex-1 flex "></span>
        {rightIcon}
        {isHovered ? rightHoverIcon : null}
      </div>
      {children}
    </>
  );
}
