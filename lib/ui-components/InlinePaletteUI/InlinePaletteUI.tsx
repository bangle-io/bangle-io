import React, { useCallback, useEffect, useRef, useState } from 'react';
import { cx, isTouchDevice } from 'utils';

const PADDING_OFFSET = 16;
const BASE_PADDING = 16;

export function InlinePaletteRow({
  dataId,
  title,
  isActive,
  onClick,
  rightIcon = null,
  rightHoverIcon = null,
  leftNode = null,
  basePadding = BASE_PADDING,
  depth = 1,
  description = '',
  className = '',
  scrollIntoViewIfNeeded = true,
  style = {},
  disabled,
  // on touch devices having :hover forces you to click twice
  allowHover = !isTouchDevice(),
}: {
  dataId: string;
  title?: string;
  isActive?: boolean;
  onClick?: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
  rightIcon?: JSX.Element | null;
  rightHoverIcon?: JSX.Element | null;
  leftNode?: JSX.Element | null;
  basePadding?: number;
  depth?: number;
  description?: string;
  className?: string;
  scrollIntoViewIfNeeded?: boolean;
  style?: React.CSSProperties;
  disabled?: boolean;
  // on touch devices having :hover forces you to click twice
  allowHover?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);

  const [isHovered, setHover] = useState(false);

  useEffect(() => {
    if (scrollIntoViewIfNeeded && isActive) {
      if ('scrollIntoViewIfNeeded' in document.body) {
        (ref.current as any)?.scrollIntoViewIfNeeded(false);
      } else {
        if (ref.current?.scrollIntoView) {
          ref.current?.scrollIntoView(false);
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
          'flex flex-row items-center inline-palette-row',
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
        {leftNode}
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
            className={cx('text-sm font-normal select-none')}
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
    </>
  );
}
