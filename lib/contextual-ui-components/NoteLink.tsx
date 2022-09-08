import React, { useCallback } from 'react';

import { useBangleStoreContext, workspace } from '@bangle.io/api';
/**
 * Component for opening a note link
 */
export function NoteLink({
  wsPath,
  children,
  className,
  onClick,
}: {
  wsPath: string;
  children: JSX.Element;
  className?: string;
  onClick?: () => void;
}) {
  const bangleStore = useBangleStoreContext();

  const _onClick = useCallback(() => {
    workspace.pushWsPath(wsPath)(bangleStore.state, bangleStore.dispatch);
    onClick?.();
  }, [wsPath, onClick, bangleStore]);

  return (
    <a
      className={className}
      // to prevent same wsPath clogging the history
      // TODO in future when we allow shift click we need to
      // update this replace check
      onClick={_onClick}
    >
      {children}
    </a>
  );
}
