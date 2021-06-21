import React, { useCallback, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

const ItemPropTypes = PropTypes.exact({
  uid: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  data: PropTypes.object,
  leftIcon: PropTypes.element,
  rightIcons: PropTypes.node,
  rightHoverIcons: PropTypes.node,
  showDividerAbove: PropTypes.bool,
  description: PropTypes.node,
  extraInfo: PropTypes.node,
  isDisabled: PropTypes.bool,
});

PaletteItemUI.propTypes = {
  item: ItemPropTypes.isRequired,
  onSelect: PropTypes.func.isRequired,
  isActive: PropTypes.bool,
  className: PropTypes.string,
  scrollIntoViewIfNeeded: PropTypes.bool,
  style: PropTypes.object,
};

export function PaletteItemUI({
  item,
  onSelect,
  // styling
  isActive,
  className = '',
  scrollIntoViewIfNeeded = true,
  style,
}) {
  const ref = useRef(null);
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

  const titleElement = (
    <span>
      <span className="u-palette-title text-base font-normal">
        {item.title}
      </span>
      {item.extraInfo && (
        <span className="u-palette-extra-info text-base font-light">
          {item.extraInfo}
        </span>
      )}
    </span>
  );

  const { uid } = item;

  const onClick = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      onSelect(uid, 'click', e);
    },
    [onSelect, uid],
  );

  return (
    <div
      data-id={item.uid}
      ref={ref}
      onClick={onClick}
      className={`universal-palette-item ${className} ${
        isActive ? 'active' : ''
      } ${item.isDisabled ? 'disabled' : ''} ${
        item.showDividerAbove ? 'show-divider-above' : ''
      }`}
      style={{
        cursor: 'pointer',
        display: 'flex',
        justifyContent: 'space-between',
        userSelect: 'none',
        ...style,
      }}
    >
      <div className="u-palette-details" style={{ display: 'flex' }}>
        <div className="left-icon">{item.leftIcon}</div>
        {item.description ? (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {titleElement}
            <span className="u-palette-description text-sm">
              {item.description}
            </span>
          </div>
        ) : (
          titleElement
        )}
      </div>
      <div>
        <span className="right-icons">{item.rightIcons}</span>
        <span className="right-hover-icons">{item.rightHoverIcons}</span>
      </div>
    </div>
  );
}
