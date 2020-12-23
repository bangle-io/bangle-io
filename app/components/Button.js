import React from 'react';

export function StackButton({
  onClick,
  isActive = false,
  className = '',
  disabled = false,
  textColor = `text-gray-100`,
  activeColor = `text-gray-900`,
  activeBgColor = `text-gray-100`,
  faType,
  stack = false,
}) {
  if (stack) {
    return (
      <button
        onClick={onClick}
        className={`fill-current ${className}`}
        disabled={disabled}
      >
        <span className={`fa-stack ${!isActive ? 'hidden' : ''}`}>
          <i className={`fa fa-circle fa-stack-2x ${activeBgColor}`}></i>
          <i className={`${faType} fa-stack-1x ${activeColor} `}></i>
        </span>
        <span className={`fa-stack ${isActive ? 'hidden' : ''}`}>
          <i className={`${faType} fa-stack-1x  ${textColor}`}></i>
        </span>
      </button>
    );
  }
}

export function BaseButton({
  onClick,
  isActive,
  activeClassName = '',
  disabled = false,
  className = '',
  faType,
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded fill-current ${
        isActive ? activeClassName : ''
      }  ${className}`}
      disabled={disabled}
    >
      <span className={``}>
        <i className={`${faType}`}></i>
      </span>
    </button>
  );
}
