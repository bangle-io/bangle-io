import React, { useCallback, useEffect, useRef, useState } from 'react';

import { useWorkspaceContext } from '@bangle.io/workspace-context';
import { FileOps } from '@bangle.io/workspaces';

import { ExtensionIframe } from './experimental-iframe/ExtensionIframe';

export function IframeNoteBrowserSidebar() {
  const { wsName } = useWorkspaceContext();
  const [html, updateHtml] = useState<Promise<string> | null>(null);
  useEffect(() => {
    FileOps.getFileAsText(`${wsName}:.bangle/test-extension.html`).then(
      (file) => {
        updateHtml(Promise.resolve(file));
      },
      (err) => {
        console.log('cannot read test extension file');
      },
    );
  }, [wsName]);
  return html ? <ExtensionIframe extensionHtml={html} /> : null;
}
