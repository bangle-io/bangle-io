import React, { useEffect, useRef, useState } from 'react';

const PADDING_OFFSET = 16;
const BASE_PADDING = 3;
export function SideBarRow({
  title,
  isActive,
  onClick,
  rightIcon,
  leftIcon,
  paddingLeft = BASE_PADDING,
  children,
  className,
  scrollIntoViewIfNeeded = true,
  style = {},
}) {
  const ref = useRef(null);

  useEffect(() => {
    if (scrollIntoViewIfNeeded && isActive) {
      if ('scrollIntoViewIfNeeded' in document.body) {
        ref.current.scrollIntoViewIfNeeded(false);
      } else {
        ref.current.scrollIntoView(false);
      }
    }
  }, [scrollIntoViewIfNeeded, isActive]);
  return (
    <>
      <div
        onClick={onClick}
        ref={ref}
        className={`flex side-bar-row flex-row items-center cursor-pointer ${className} ${
          isActive ? `active` : ''
        }`}
        style={{
          paddingLeft: paddingLeft,
          paddingRight: PADDING_OFFSET,
          ...style,
        }}
      >
        {leftIcon}
        <span className="text-lg truncate select-none">{title}</span>
        <span className="flex-1 flex "></span>
        {rightIcon}
      </div>
      {children
        ? [].concat(children).map((c) =>
            React.cloneElement(c, {
              paddingLeft: paddingLeft + PADDING_OFFSET,
            }),
          )
        : null}
    </>
  );
}

export function CollapsibleSideBarRow({
  children,
  onClick,
  activeLeftIcon,
  leftIcon,
  initialCollapse = false,
  isSticky = false,
  ...props
}) {
  const [collapsed, toggleCollapse] = useState(initialCollapse);

  leftIcon = collapsed ? activeLeftIcon : leftIcon;
  let className = isSticky ? 'sticky top-0' : '';
  className += collapsed ? ' collapsed ' : '';
  return (
    <SideBarRow
      {...props}
      className={className}
      leftIcon={leftIcon}
      onClick={() => {
        toggleCollapse(!collapsed);
        if (onClick) {
          onClick();
        }
      }}
    >
      {collapsed ? null : children}
    </SideBarRow>
  );
}

// export function CollapsibleStickySideBarRow({
//   children,
//   onClick,
//   activeLeftIcon,
//   leftIcon,
//   ...props
// }) {
//   const [collapse, toggleCollapse] = useState(false);
//   const [isSticky, setSticky] = useState(false);
//   const ref = useRef(null);
//   const handleScroll = () => {
//     if (ref.current) {
//       setSticky(ref.current.getBoundingClientRect().top <= 0);
//     }
//   };
//   useEffect(() => {
//     window.addEventListener('scroll', handleScroll);
//     return () => {
//       window.removeEventListener('scroll', () => handleScroll);
//     };
//   }, []);

//   leftIcon = collapse ? activeLeftIcon : leftIcon;
//   return (
//     <SideBarRow
//       {...props}
//       leftIcon={leftIcon}
//       onClick={() => {
//         toggleCollapse(!collapse);
//         if (onClick) {
//           onClick();
//         }
//       }}
//     >
//       {collapse ? null : children}
//     </SideBarRow>
//   );
// }
