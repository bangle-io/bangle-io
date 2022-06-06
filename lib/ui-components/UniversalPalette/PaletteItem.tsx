import type { ReactNode } from 'react';
import React, { useEffect, useRef } from 'react';

import {
  cx,
  isTouchDevice,
  safeScrollIntoViewIfNeeded,
} from '@bangle.io/utils';

export interface ItemType {
  uid: string;
  title: ReactNode;
  data?: any;
  leftNode?: ReactNode;
  rightNode?: ReactNode;
  rightHoverNode?: ReactNode;
  showDividerAbove?: boolean;
  description?: ReactNode;
  extraInfo?: ReactNode;
  isDisabled?: boolean;
}

export function PaletteItemUI({
  item,
  onClick,
  // styling
  isActive,
  className = '',
  scrollIntoViewIfNeeded = true,
  allowHover = !isTouchDevice,
  style,
}: {
  allowHover?: boolean;
  item: ItemType;
  onClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  isActive?: boolean;
  className?: string;
  scrollIntoViewIfNeeded?: boolean;
  style?: any;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollIntoViewIfNeeded && isActive) {
      ref.current && safeScrollIntoViewIfNeeded(ref.current, false);
    }
  }, [scrollIntoViewIfNeeded, isActive]);

  const titleElement = (
    <span>
      <span className="text-base font-normal">{item.title}</span>
      {item.extraInfo && (
        <span className="B-ui-components_extra-info text-base font-light">
          {item.extraInfo}
        </span>
      )}
    </span>
  );

  return (
    <div
      data-id={item.uid}
      ref={ref}
      onClick={onClick}
      className={cx(
        'B-ui-components_universal-palette-item',
        className,
        isActive && 'BU_active',
        item.isDisabled && 'BU_disabled',
        item.showDividerAbove && 'BU_divider',
        allowHover && 'BU_allow-hover',
      )}
      style={{
        cursor: 'pointer',
        display: 'flex',
        justifyContent: 'space-between',
        userSelect: 'none',
        ...style,
      }}
    >
      <div className="flex flex-row">
        <div className="B-ui-components_left-node">{item.leftNode}</div>
        {item.description ? (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {titleElement}
            <span className="B-ui-components_description text-sm">
              {item.description}
            </span>
          </div>
        ) : (
          titleElement
        )}
      </div>
      <div className="flex flex-row">
        <span className="B-ui-components_right-node">{item.rightNode}</span>
        <span className="B-ui-components_right-hover-node">
          {item.rightHoverNode}
        </span>
      </div>
    </div>
  );
}
