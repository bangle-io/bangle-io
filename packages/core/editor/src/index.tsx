import 'prosekit/basic/typography.css';
import 'prosekit/extensions/list/style.css';
import './typography.css';

import { cx } from '@bangle.io/base-utils';
import { defineBasicExtension } from 'prosekit/basic';
import { union } from 'prosekit/core';
import {
  defineCodeBlock,
  defineCodeBlockShiki,
} from 'prosekit/extensions/code-block';
import { defineDropCursor } from 'prosekit/extensions/drop-cursor';
import React, { useState } from 'react';
import { useCoreServices } from '../../context/src';
export { PmEditorService } from './pm-editor-service';

export function Editor({
  wsPath,
  className,
}: {
  wsPath: string;
  className?: string;
}) {
  const { pmEditorService } = useCoreServices();
  const [mountEditor] = useState(() => pmEditorService.newEditor({ wsPath }));

  return (
    <div className="box-border flex h-full min-h-36 w-full flex-col ">
      <div className="relative box-border w-full flex-1">
        <div
          ref={mountEditor}
          className={cx(
            'ProseMirror box-border min-h-full py-8 outline-none outline-0',
            '[&_:not(pre)_code]:rounded-md [&_:not(pre)_code]:bg-muted/40 [&_:not(pre)_code]:px-1.5 [&_:not(pre)_code]:py-0.5 [&_:not(pre)_code]:font-mono',
            "[&_pre]:bg-muted/30 [&_span[data-mention='tag']]:text-primary [&_span[data-mention='user']]:text-accent",
            className,
          )}
        />
      </div>
    </div>
  );
}
