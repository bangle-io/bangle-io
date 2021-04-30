import React, { useCallback, useEffect, useRef, useState } from 'react';
import { cx, isTouchDevice } from 'utils/index';

const PADDING_OFFSET = 16;
const BASE_PADDING = 16;

export function ItemRow({
  dataId,
  title,
  isActive,
  onClick,
  rightIcon,
  rightHoverIcon = null,
  leftIcon,
  basePadding = BASE_PADDING,
  depth = 1,
  children,
  description = '',
  className = '',
  scrollIntoViewIfNeeded = true,
  style = {},
  disabled,
  // on touch devices having :hover forces you to click twice
  allowHover = !isTouchDevice(),
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
    allowHover && setHover(true);
  }, [allowHover]);

  const mouseLeave = useCallback(() => {
    allowHover && setHover(false);
  }, [allowHover]);

  return (
    <>
      <div
        data-id={dataId}
        onClick={onClick}
        onMouseEnter={mouseEnter}
        onMouseLeave={mouseLeave}
        ref={ref}
        className={cx(
          'flex flex-row items-center inline-command-palette item-row',
          disabled ? 'cursor-not-allowed' : 'cursor-pointer',
          className,
          isActive && 'active',
          allowHover && 'hover-allowed',
          disabled && 'disabled',
        )}
        style={{
          paddingLeft: depth * basePadding,
          paddingRight: PADDING_OFFSET,
          ...style,
        }}
      >
        {leftIcon}
        <span className="flex flex-col">
          <span
            className={cx('text-base font-bold truncate select-none')}
            style={{
              color: disabled ? 'var(--font-lighter-color)' : 'inherit',
            }}
          >
            {title}
          </span>
          <span
            className={cx('text-base font-normal truncate select-none')}
            style={{
              color: disabled ? 'var(--font-lighter-color)' : 'inherit',
            }}
          >
            {description}
          </span>
        </span>

        <span className="flex-1 flex "></span>
        {rightIcon}
        {isHovered ? rightHoverIcon : null}
      </div>
      {children}
    </>
  );
}
