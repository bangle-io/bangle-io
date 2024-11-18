import './Dhancha.css';

import type { ReactNode } from 'react';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { cx } from '@bangle.io/base-utils';

import { useStickyNavigation } from './use-sticky-navigation';

type ResizeOptions = {
  defaultWidth: number;
  minWidth: number;
  maxWidth: number;
  onChange: (width: number) => void;
  onFinish?: () => void;
  onStart?: () => void;
  type: 'left' | 'right';
};

function disableUserSelect(elements: (HTMLElement | null)[]): void {
  for (const element of elements) {
    if (element) {
      element.style.userSelect = 'none';
      element.style.pointerEvents = 'none';
    }
  }
}

function enableUserSelect(elements: (HTMLElement | null)[]): void {
  for (const element of elements) {
    if (element) {
      element.style.removeProperty('user-select');
      element.style.removeProperty('pointer-events');
    }
  }
}

function setCSSVariable(propertyName: string, value: number): void {
  document.documentElement.style.setProperty(propertyName, `${value}px`);
}

function parseRootCSSVariable(variable: string): number {
  return Number.parseInt(
    getComputedStyle(document.documentElement)
      .getPropertyValue(variable)
      .trim(),
    10,
  );
}

export function calcMainContentWidth(opts: {
  leftWidth: number;
  rightWidth: number;
  hasLeftAside: boolean;
  hasRightAside: boolean;
  activitybarWidth: number;
  hasActivitybar: boolean;
  borderWidth: number;
}) {
  const leftWidth = opts.hasLeftAside ? opts.leftWidth : 0;
  const rightWidth = opts.hasRightAside ? opts.rightWidth : 0;
  const activitybarWidth = opts.hasActivitybar ? opts.activitybarWidth : 0;
  // we use a thicker separator to help with picking the dragbar
  // NOTE: if we change the separator width, we need to change it in CSS aswell
  const separatorWidth = 2 * opts.borderWidth;

  const totalSeparatorWidth =
    (opts.hasLeftAside ? separatorWidth : 0) +
    (opts.hasRightAside ? separatorWidth : 0);

  const totalWidth = window.innerWidth;

  const summedUp =
    leftWidth + rightWidth + totalSeparatorWidth + activitybarWidth;

  return Math.max(0, totalWidth - summedUp);
}

export function useSeparator({
  onChange,
  type,
  defaultWidth,
  minWidth,
  maxWidth,
  onFinish,
  onStart,
}: ResizeOptions) {
  const ref = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const lastXRef = useRef<number>(0);
  const rafIdRef = useRef<number | null>(null);

  const updateWidth = useCallback(
    (diff: number) => {
      const finalValue = Math.min(
        Math.max(defaultWidth + diff * (type === 'left' ? 1 : -1), minWidth),
        maxWidth,
      );

      onChange?.(finalValue);
    },
    [defaultWidth, minWidth, maxWidth, onChange, type],
  );

  const onMouseMove = useCallback(
    (event: MouseEvent) => {
      event.preventDefault();
      if (!rafIdRef.current) {
        rafIdRef.current = requestAnimationFrame(() => {
          updateWidth(event.clientX - lastXRef.current);
          rafIdRef.current = null;
        });
      }
    },
    [updateWidth],
  );

  const onMouseDown = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      setIsDragging(true);
      document.body.style.cursor = 'col-resize';
      lastXRef.current = event.clientX;
      onStart?.();
    },
    [onStart],
  );

  const onMouseUp = useCallback(() => {
    setIsDragging(false);
    document.body.style.removeProperty('cursor');
    onFinish?.();

    lastXRef.current = 0;
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  }, [onFinish]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    } else {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [isDragging, onMouseMove, onMouseUp]);

  return useMemo(
    () => ({
      ref,
      onMouseDown,
      className: cx('B-ui-aside-separator', isDragging && 'BU_is-active'),
      style: {
        gridArea:
          type === 'right' ? 'right-aside-separator' : 'left-aside-separator',
      },
    }),
    [onMouseDown, type, isDragging],
  );
}

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
  activitybar?: ReactNode;
  leftAside?: ReactNode;
  mainContent: ReactNode;
  rightAside?: ReactNode;
  titlebar: ReactNode;
}) {
  const titleBarRef = useRef<HTMLDivElement>(null);
  const leftAsideRef = useRef<HTMLDivElement>(null);
  const rightAsideRef = useRef<HTMLDivElement>(null);
  const mainContentRef = useRef<HTMLDivElement>(null);

  const [defaultLeftWidth] = useState(() =>
    parseRootCSSVariable('--BV-miscLeftAsideWidth'),
  );
  const [defaultRightWidth] = useState(() =>
    parseRootCSSVariable('--BV-miscRightAsideWidth'),
  );
  const [defaultBorderWidth] = useState(() =>
    parseRootCSSVariable('--BV-borderWidthDEFAULT'),
  );

  const _defaultMainContentWidth = useMemo(() => {
    return calcMainContentWidth({
      leftWidth: defaultLeftWidth,
      rightWidth: defaultRightWidth,
      hasLeftAside: !!leftAside,
      hasRightAside: !!rightAside,
      activitybarWidth: 0,
      hasActivitybar: !!activitybar,
      borderWidth: defaultBorderWidth,
    });
  }, [
    leftAside,
    defaultBorderWidth,
    defaultLeftWidth,
    rightAside,
    defaultRightWidth,
    activitybar,
  ]);

  const onStart = useCallback(() => {
    disableUserSelect([
      leftAsideRef.current,
      rightAsideRef.current,
      titleBarRef.current,
      mainContentRef.current,
    ]);
  }, []);

  const onFinish = useCallback(() => {
    enableUserSelect([
      leftAsideRef.current,
      rightAsideRef.current,
      titleBarRef.current,
      mainContentRef.current,
    ]);
  }, []);

  const leftSeparatorProps = useSeparator({
    type: 'left',
    defaultWidth: defaultLeftWidth,
    minWidth: 200,
    maxWidth: 500,
    onChange: (width) => {
      setCSSVariable('--BV-miscLeftAsideWidth', width);
    },
    onStart,
    onFinish,
  });

  const rightSeparatorProps = useSeparator({
    type: 'right',
    defaultWidth: defaultRightWidth,
    minWidth: 200,
    maxWidth: 500,
    onStart,
    onFinish,
    onChange: (width) => {
      setCSSVariable('--BV-miscRightAsideWidth', width);
    },
  });

  useAddUtilClasses({
    widescreen: true,
    showActivitybar: Boolean(activitybar),
    showLeftAside: Boolean(leftAside),
    showRightAside: Boolean(rightAside),
  });

  return (
    <div className="B-ui-dhancha-widescreen">
      {activitybar && (
        <nav
          aria-label="Title Bar"
          className="B-ui-activitybar"
          style={{
            gridArea: 'activitybar',
          }}
        >
          {activitybar}
        </nav>
      )}
      {leftAside && (
        <aside
          ref={leftAsideRef}
          style={{
            gridArea: 'left-aside',
          }}
          className="B-ui-left-aside"
        >
          {leftAside}
        </aside>
      )}
      {leftAside && (
        <div {...leftSeparatorProps}>
          {/* two diffs to improve picking of the drag since its too thin otherwise*/}
          <div />
          <div />
        </div>
      )}
      <TitlebarContainer
        ref={titleBarRef}
        style={{ gridArea: 'titlebar-container' }}
        className="titlebar-container"
      >
        {titlebar}
      </TitlebarContainer>
      <div
        ref={mainContentRef}
        style={{
          gridArea: 'main-container',
        }}
        className="B-ui-main-content"
      >
        {mainContent}
      </div>
      {rightAside && (
        <div {...rightSeparatorProps}>
          {/* two diffs to improve picking of the drag since its too thin otherwise*/}
          <div />
          <div />
        </div>
      )}
      {rightAside && (
        <aside
          ref={rightAsideRef}
          style={{ gridArea: 'right-aside' }}
          className="B-ui-right-aside"
        >
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

  useAddUtilClasses({
    widescreen: false,
    showActivitybar: false,
    showLeftAside: false,
    showRightAside: false,
  });

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
    <nav
      aria-label="Title Bar"
      ref={ref}
      className={`B-ui-dhancha-titlebar ${props.className}`}
      style={props.style}
    >
      {props.children}
    </nav>
  );
});

function useAddUtilClasses({
  widescreen,
  showLeftAside,
  showRightAside,
  showActivitybar,
}: {
  widescreen: boolean;
  showLeftAside: boolean;
  showRightAside: boolean;
  showActivitybar: boolean;
}) {
  useEffect(() => {
    document.body.classList.toggle(
      'BU_show-left-aside',
      widescreen && showLeftAside,
    );
    document.body.classList.toggle(
      'BU_show-right-aside',
      widescreen && showRightAside,
    );
    document.body.classList.toggle(
      'BU_show-activitybar',
      widescreen && showActivitybar,
    );
  }, [showLeftAside, showRightAside, showActivitybar, widescreen]);
}
