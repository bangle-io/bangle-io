import React, { useMemo, useCallback, useEffect, useRef } from 'react';
import { getActiveIndex } from './hooks';
import PropTypes from 'prop-types';

PaletteItem.propTypes = {
  uid: PropTypes.string.isRequired,
  onSelect: PropTypes.func.isRequired,
  items: PropTypes.array.isRequired,
  counter: PropTypes.number.isRequired,
};

export function PaletteItem({ uid, onSelect, items, counter, ...props }) {
  const isActive = useMemo(() => {
    return items[getActiveIndex(counter, items.length)]?.uid === uid;
  }, [items, uid, counter]);

  const onClick = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      onSelect(uid, 'click', e);
    },
    [onSelect, uid],
  );

  return (
    <PaletteItemUI uid={uid} onClick={onClick} isActive={isActive} {...props} />
  );
}

PaletteItemUI.propTypes = {
  uid: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
};

export function PaletteItemUI({
  uid,
  title,
  extraInfo,
  description,
  onClick,

  // styling
  isActive,
  className = '',
  leftIcon,
  rightIcons,
  rightHoverIcons,
  isDisabled = false,
  showDividerAbove = false,
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
      <span className="mp-title">{title}</span>
      {extraInfo && <span className="mp-extra-info">{extraInfo}</span>}
    </span>
  );

  return (
    <div
      data-id={uid}
      ref={ref}
      onClick={onClick}
      className={`universal-palette-item ${className} ${
        isActive ? 'active' : ''
      } ${isDisabled ? 'disabled' : ''} ${
        showDividerAbove ? 'show-divider-above' : ''
      }`}
      style={{
        cursor: 'pointer',
        display: 'flex',
        justifyContent: 'space-between',
        userSelect: 'none',
        ...style,
      }}
    >
      <div className="mp-details" style={{ display: 'flex' }}>
        <div className="left-icon">{leftIcon}</div>
        {description ? (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {titleElement}
            <span className="description">{description}</span>
          </div>
        ) : (
          titleElement
        )}
      </div>
      <div>
        <span className="right-icons">{rightIcons}</span>
        <span className="right-hover-icons">{rightHoverIcons}</span>
      </div>
    </div>
  );
}
