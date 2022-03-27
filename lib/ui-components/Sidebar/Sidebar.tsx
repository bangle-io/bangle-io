import React from 'react';

import { cx } from '@bangle.io/utils';

export function ItemContainer({
  hoverBgColorChange = false,
  className = '',
  children,
  ...props
}: {
  hoverBgColorChange?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cx(hoverBgColorChange && 'BU_hover', className)} {...props}>
      {children}
    </div>
  );
}

export function Title({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <ItemContainer className={'font-semibold text-sm uppercase ' + className}>
      {children}
    </ItemContainer>
  );
}

export function Container({
  className = '',
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
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

export function ScrollableContainer({
  children,
}: {
  children: React.ReactNode;
}) {
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

export * from './SidebarRow2';
