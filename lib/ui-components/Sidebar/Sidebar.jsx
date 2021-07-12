import React from 'react';
import { cx } from 'utils';

export function ItemContainer({
  hoverBgColorChange = false,
  className = '',
  children,
  ...props
}) {
  return (
    <div
      className={cx(
        'b-item-container',
        hoverBgColorChange && 'hover',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function Title({ children, className = '' }) {
  return (
    <ItemContainer className={'font-semibold text-sm uppercase ' + className}>
      {children}
    </ItemContainer>
  );
}

export function Container({ className = '', children }) {
  return (
    <div
      className={'flex flex-col h-full ' + className}
      style={{
        overflowY: 'auto',
      }}
    >
      {children}
    </div>
  );
}

export function ScrollableContainer({ children }) {
  return (
    <div
      className="flex-grow"
      style={{
        overflowY: 'auto',
      }}
    >
      {children}
    </div>
  );
}

export * from './SidebarRow';
export * from './SidebarRow2';
