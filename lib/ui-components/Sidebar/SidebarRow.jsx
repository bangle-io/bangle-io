import React, { useCallback, useEffect, useRef, useState } from 'react';
import { cx, isTouchDevice } from 'utils/index';

const PADDING_OFFSET = 16;
const BASE_PADDING = 16;

export function Row({
  dataId,
  title,
  isActive,
  onClick,
  rightIcon,
  rightHoverIcon = null,
  leftNode,
  basePadding = BASE_PADDING,
  depth = 1,
  children,
  className = '',
  scrollIntoViewIfNeeded = true,
  style = {},
  disabled,
  textSizeClassName = 'text-lg',
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
          'flex side-bar-row flex-row items-center',
          disabled ? 'cursor-not-allowed' : 'cursor-pointer',
          className,
          isActive && 'active',
          allowHover && 'hover-allowed',
        )}
        style={{
          paddingLeft: depth * basePadding,
          paddingRight: PADDING_OFFSET,
          ...style,
        }}
      >
        {leftNode}
        <span
          className={cx(textSizeClassName, ' truncate select-none')}
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
