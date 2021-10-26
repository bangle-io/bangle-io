import React, { useCallback } from 'react';
import { NavLink } from 'react-router-dom';
import { useWorkspaceContext } from 'workspace-context';
import { resolvePath } from 'ws-path';
/**
 * Component for opening a note link
 */
export function NoteLink({
  wsPath,
  children,
  className,
  activeClassName,
  onClick,
}: {
  wsPath: string;
  children: JSX.Element;
  className?: string;
  activeClassName?: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => void;
}) {
  const pathname = resolvePath(wsPath).locationPath;
  const toCallback = useCallback(
    (location) => ({
      ...location,
      pathname,
    }),
    [pathname],
  );
  const { primaryWsPath } = useWorkspaceContext();

  return (
    <NavLink
      className={className}
      to={toCallback}
      activeClassName={activeClassName}
      // to prevent same wsPath clogging the history
      // TODO in future when we allow shift click we need to
      // update this replace check
      replace={primaryWsPath === wsPath}
      onClick={onClick}
    >
      {children}
    </NavLink>
  );
}
