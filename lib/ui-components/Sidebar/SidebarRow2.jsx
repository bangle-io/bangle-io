import React from 'react';

import { UniversalPalette } from '../UniversalPalette';

Row2.propType = {
  item: UniversalPalette.ItemPropTypes,
};

export function Row2({
  item,
  className = '',
  titleClassName = 'text-base font-normal',
  extraInfoClassName = 'text-base font-light',
  descriptionClassName = 'text-sm',
  onClick,
  isActive,
  style,
}) {
  const titleElement = (
    <span>
      <span className={'b-title ' + titleClassName}>{item.title}</span>
      {item.extraInfo && (
        <span className={'b-extra-info ' + extraInfoClassName}>
          {item.extraInfo}
        </span>
      )}
    </span>
  );

  return (
    <div
      data-id={item.uid}
      onClick={onClick}
      className={`b-sidebar-row2 ${className} ${isActive ? 'active' : ''} ${
        item.isDisabled ? 'disabled' : ''
      } ${item.showDividerAbove ? 'b-divider' : ''}`}
      style={{
        cursor: 'pointer',
        display: 'flex',
        justifyContent: 'space-between',
        userSelect: 'none',
        ...style,
      }}
    >
      <div className="flex flex-row">
        <div className="b-left-node">{item.leftNode}</div>
        {item.description ? (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {titleElement}
            <span className={'b-description ' + descriptionClassName}>
              {item.description}
            </span>
          </div>
        ) : (
          titleElement
        )}
      </div>
      <div className="flex flex-row">
        <span className="b-right-node">{item.rightNode}</span>
        <span className="b-right-hover-node">{item.rightHoverNode}</span>
      </div>
    </div>
  );
}
