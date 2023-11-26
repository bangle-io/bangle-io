import './Dhancha.css';

import type { ReactNode } from 'react';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { cx } from '@bangle.io/utils';

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
    parseInt(
      getComputedStyle(document.documentElement)
        .getPropertyValue('--BV-miscLeftAsideWidth')
        .trim(),
      10,
    ),
  );

  const [defaultRightWidth] = useState(() =>
    parseInt(
      getComputedStyle(document.documentElement)
        .getPropertyValue('--BV-miscRightAsideWidth')
        .trim(),
      10,
    ),
  );

  const onStart = useCallback(() => {
    if (leftAsideRef.current) {
      leftAsideRef.current.style.userSelect = 'none';
      leftAsideRef.current.style.pointerEvents = 'none';
    }
    if (rightAsideRef.current) {
      rightAsideRef.current.style.userSelect = 'none';
      rightAsideRef.current.style.pointerEvents = 'none';
    }
    if (titleBarRef.current) {
      titleBarRef.current.style.userSelect = 'none';
      titleBarRef.current.style.pointerEvents = 'none';
    }
    if (mainContentRef.current) {
      mainContentRef.current.style.userSelect = 'none';
      mainContentRef.current.style.pointerEvents = 'none';
    }
  }, []);
  const onFinish = useCallback(() => {
    if (leftAsideRef.current) {
      leftAsideRef.current.style.removeProperty('user-select');
      leftAsideRef.current.style.removeProperty('pointer-events');
    }

    if (rightAsideRef.current) {
      rightAsideRef.current.style.removeProperty('user-select');
      rightAsideRef.current.style.removeProperty('pointer-events');
    }

    if (titleBarRef.current) {
      titleBarRef.current.style.removeProperty('user-select');
      titleBarRef.current.style.removeProperty('pointer-events');
    }

    if (mainContentRef.current) {
      mainContentRef.current.style.removeProperty('user-select');
      mainContentRef.current.style.removeProperty('pointer-events');
    }
  }, []);

  const leftSeparatorProps = useSeparator({
    type: 'left',
    defaultWidth: defaultLeftWidth,
    minWidth: 200,
    maxWidth: 500,
    onChange: (width) => {
      document.documentElement.style.setProperty(
        '--BV-miscLeftAsideWidth',
        `${width}px`,
      );
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
      document.documentElement.style.setProperty(
        '--BV-miscRightAsideWidth',
        `${width}px`,
      );
    },
  });

  const leftAsideStyle: React.CSSProperties = {
    gridArea: 'left-aside',
  };

  const titlebarContainerStyle: React.CSSProperties = {
    gridArea: 'titlebar-container',
  };

  const mainContentStyle: React.CSSProperties = {
    gridArea: 'main-container',
  };

  const rightAsideStyle: React.CSSProperties = {
    gridArea: 'right-aside',
  };

  return (
    <div
      className={cx(
        'B-ui-dhancha-widescreen',
        leftAside && 'B-ui-has-left-aside',
        rightAside && 'B-ui-has-right-aside',
        activitybar && 'B-ui-has-activitybar',
      )}
    >
      {activitybar && (
        <div
          role="navigation"
          aria-label="Title Bar"
          className="B-ui-activitybar"
          style={{
            gridArea: 'activitybar',
          }}
        >
          {activitybar}
        </div>
      )}
      {leftAside && (
        <aside
          ref={leftAsideRef}
          style={leftAsideStyle}
          className="B-ui-left-aside"
        >
          {leftAside}
        </aside>
      )}
      {leftAside && (
        <div {...leftSeparatorProps}>
          {/* two diffs to improve picking of the drag since its too thin otherwise*/}
          <div></div>
          <div></div>
        </div>
      )}
      <TitlebarContainer
        ref={titleBarRef}
        style={titlebarContainerStyle}
        className="titlebar-container"
      >
        {titlebar}
      </TitlebarContainer>
      <div
        ref={mainContentRef}
        style={mainContentStyle}
        className="B-ui-main-content"
      >
        {mainContent}
      </div>
      {rightAside && (
        <div {...rightSeparatorProps}>
          {/* two diffs to improve picking of the drag since its too thin otherwise*/}
          <div></div>
          <div></div>
        </div>
      )}
      {rightAside && (
        <aside
          ref={rightAsideRef}
          style={rightAsideStyle}
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
