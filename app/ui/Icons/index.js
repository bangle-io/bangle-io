import React from 'react';

export const Svg = ({ children, style = {}, size, className = '' }) => (
  <svg
    style={style}
    viewBox={'0 0 24 24'}
    xmlns="http://www.w3.org/2000/svg"
    className={`fill-current ${size ? `h-${size} w-${size}` : ''} ${className}`}
  >
    {children}
  </svg>
);

export const ChevronDown = (props) => (
  <Svg {...props}>
    <path d="M6.343 7.757L4.93 9.172 12 16.242l7.071-7.07-1.414-1.415L12 13.414 6.343 7.757z" />
  </Svg>
);

export const ChevronRight = (props) => (
  <Svg {...props}>
    <path d="M10.5858 6.34317L12 4.92896L19.0711 12L12 19.0711L10.5858 17.6569L16.2427 12L10.5858 6.34317Z" />
  </Svg>
);
