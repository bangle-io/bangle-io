import React, { useCallback } from 'react';

import { nsmApi2, wsPathHelpers } from '@bangle.io/api';
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
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  const _onClick = useCallback(() => {
    nsmApi2.workspace.pushPrimaryWsPath(wsPathHelpers.createWsPath(wsPath));
    onClick?.();
  }, [wsPath, onClick]);

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
