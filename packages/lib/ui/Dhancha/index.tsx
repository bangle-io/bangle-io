import './Dhancha.css';

import type { ReactNode } from 'react';
import React, { useRef } from 'react';

import { vars } from '@bangle.io/css-vars';
import { cx } from '@bangle.io/utils';

import { useStickyNavigation } from './use-sticky-navigation';

/**
 * rightAside is expected to toggleable
 */
export function DhanchaWidescreen({
  activitybar,
  leftAside,
  mainContent,
  rightAside,
  titlebar,
}: {
  activitybar: ReactNode;
  leftAside?: ReactNode;
  mainContent: ReactNode;
  rightAside?: ReactNode;
  titlebar: ReactNode;
}) {
  const leftAsideStyle: React.CSSProperties = {
    gridArea: 'left-aside',
    // maxWidth: vars.misc.leftAsideWidth,
  };

  const titlebarContainerStyle: React.CSSProperties = {
    gridArea: 'titlebar-container',
  };

  const mainContentStyle: React.CSSProperties = {
    gridArea: 'main-container',
  };

  const rightAsideStyle: React.CSSProperties = {
    gridArea: 'right-aside',
    // maxWidth: vars.misc.rightAsideWidth,
  };

  return (
    <div
      className={cx(
        'B-ui-dhancha-widescreen',
        leftAside && 'B-ui-has-left-aside',
        rightAside && 'B-ui-has-right-aside',
      )}
    >
      <div
        role="navigation"
        aria-label="Title Bar"
        style={{
          gridArea: 'activitybar',
        }}
      >
        {activitybar}
      </div>
      {leftAside && (
        <aside style={leftAsideStyle} className="left-aside">
          {leftAside}
        </aside>
      )}
      <TitlebarContainer
        style={titlebarContainerStyle}
        className="titlebar-container"
      >
        {titlebar}
      </TitlebarContainer>
      <div style={mainContentStyle} className="main-content">
        {mainContent}
      </div>
      {rightAside && (
        <aside style={rightAsideStyle} className="right-aside">
          {rightAside}
        </aside>
      )}
    </div>
  );
}

export function DhanchaSmallscreen({
  titlebar,
  mainContent,
}: {
  titlebar: ReactNode;
  mainContent: ReactNode;
}) {
  const titlebarRef = useRef<HTMLDivElement>(null);

  useStickyNavigation(titlebarRef);

  return (
    <div>
      <TitlebarContainer ref={titlebarRef}>{titlebar}</TitlebarContainer>
      <div>{mainContent}</div>
    </div>
  );
}

const TitlebarContainer = React.forwardRef<
  HTMLDivElement,
  { children: ReactNode; style?: React.CSSProperties; className?: string }
>(function TitlebarContainer(props, ref) {
  return (
    <div
      role="navigation"
      aria-label="Title Bar"
      ref={ref}
      className={'B-ui-dhancha-titlebar ' + props.className}
      style={props.style}
    >
      {props.children}
    </div>
  );
});
