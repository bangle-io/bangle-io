import 'prosemirror-view/style/prosemirror.css';
import './typography.css';

import { cx } from '@bangle.io/base-utils';
import { useCoreServices } from '@bangle.io/context';
import React, { useState } from 'react';
import { LinkMenu, SlashCommand } from './components';
export { PmEditorService } from './pm-editor-service';

export function Editor({
  wsPath,
  className,
  name,
}: {
  wsPath: string;
  className?: string;
  name: string;
}) {
  const { pmEditorService } = useCoreServices();
  const [mountEditorRef] = useState(() =>
    pmEditorService.newEditor({ wsPath, name }),
  );

  return (
    <div className="box-border flex h-full min-h-36 w-full flex-col ">
      <div className="relative box-border w-full flex-1">
        <div
          ref={mountEditorRef}
          data-editor-name={name}
          className={cx(
            'ProseMirror box-border min-h-full py-8 outline-none outline-0',
            '[&_:not(pre)_code]:rounded-md [&_:not(pre)_code]:bg-muted/40 [&_:not(pre)_code]:px-1.5 [&_:not(pre)_code]:py-0.5 [&_:not(pre)_code]:font-mono',
            "[&_pre]:bg-muted/30 [&_span[data-mention='tag']]:text-primary [&_span[data-mention='user']]:text-accent",
            className,
          )}
        />
        <SlashCommand editorName={name} />
        <LinkMenu editorName={name} />
      </div>
    </div>
  );
}
