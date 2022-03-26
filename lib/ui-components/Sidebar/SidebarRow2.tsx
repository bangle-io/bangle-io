import React from 'react';

import { cx, isTouchDevice } from '@bangle.io/utils';

import { ItemType } from '../UniversalPalette/PaletteItem';

export function Row2({
  item,
  className = '',
  titleClassName = 'text-base font-normal',
  extraInfoClassName = 'text-base font-light',
  descriptionClassName = 'text-sm',
  onClick,
  isActive,
  style,
  // on touch devices having :hover forces you to click twice
  allowHover = !isTouchDevice(),
  extraInfoOnNewLine = false,
}: {
  item: ItemType;
  onClick?: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
  className?: string;
  titleClassName?: string;
  extraInfoClassName?: string;
  descriptionClassName?: string;
  isActive?: boolean;
  style?: any;
  allowHover?: boolean;
  extraInfoOnNewLine?: boolean;
}) {
  const titleElement = (
    <span className={cx(extraInfoOnNewLine && 'flex flex-col')}>
      <span className={'b-title ' + titleClassName}>{item.title}</span>
      {item.extraInfo && (
        <span
          className={cx(
            'b-ui-components_extra-info ' + extraInfoClassName,
            extraInfoOnNewLine && 'b-ui-components_extra-info-on-new-line',
          )}
        >
          {item.extraInfo}
        </span>
      )}
    </span>
  );

  return (
    <div
      role="button"
      data-id={item.uid}
      onClick={onClick}
      className={cx(
        'b-ui-components_sidebar-row2',
        allowHover && 'bu_hover',
        isActive && 'bu_active',
        item.isDisabled && 'bu_disabled',
        item.showDividerAbove && 'bu_divider',
        className,
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
        <div className="b-ui-components_left-node">{item.leftNode}</div>
        {item.description ? (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {titleElement}
            <span
              className={'b-ui-components_description ' + descriptionClassName}
            >
              {item.description}
            </span>
          </div>
        ) : (
          titleElement
        )}
      </div>
      <div className="flex flex-row">
        <span className="b-ui-components_right-node">{item.rightNode}</span>
        <span className="b-ui-components_right-hover-node">
          {item.rightHoverNode}
        </span>
      </div>
    </div>
  );
}
