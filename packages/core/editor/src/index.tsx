import 'prosekit/basic/typography.css';
import './typography.css';
import { cx } from '@bangle.io/base-utils';
import { defineBasicExtension } from 'prosekit/basic';
import {
  type NodeJSON,
  createEditor,
  htmlFromNode,
  jsonFromHTML,
  jsonFromNode,
} from 'prosekit/core';
import { union } from 'prosekit/core';
import {
  defineCodeBlock,
  defineCodeBlockShiki,
} from 'prosekit/extensions/code-block';
import { defineDropCursor } from 'prosekit/extensions/drop-cursor';
import { ListDOMSerializer } from 'prosekit/extensions/list';
import type { ProseMirrorNode } from 'prosekit/pm/model';
import { ProseKit, useDocChange } from 'prosekit/react';
import React, { useEffect, useState } from 'react';
import { useCallback, useMemo } from 'react';
import { htmlFromMarkdown, markdownFromHTML } from './remark';

export function defineExtension() {
  return union(
    defineBasicExtension(),
    defineDropCursor(),
    defineCodeBlock(),
    defineCodeBlockShiki({
      themes: ['github-light'],
      langs: ['typescript', 'javascript', 'python', 'rust', 'go', 'java'],
    }),
  );
}
export function Editor({
  wsPath,
  writeNote,
  readNote,
}: {
  wsPath: string;
  readNote: (wsPath: string) => Promise<string | undefined>;
  writeNote: (wsPath: string, content: string) => Promise<void>;
}) {
  const [defaultContent, setDefaultContent] = useState<NodeJSON | undefined>();
  const [key, setKey] = useState(1);
  useEffect(() => {
    void readNote(wsPath).then((content) => {
      if (!content) {
        return;
      }
      const html = htmlFromMarkdown(content);
      setDefaultContent(jsonFromHTML(html, { schema: editor.schema }));
      setKey((key) => key + 1);
    });
  }, [wsPath, readNote]);

  const editor = useMemo(() => {
    const extension = defineExtension();
    return createEditor({ extension, defaultContent });
  }, [defaultContent]);

  const handleSave = useCallback(() => {
    const html = htmlFromNode(editor.view.state.doc, {
      DOMSerializer: ListDOMSerializer,
    });
    const record = markdownFromHTML(html);
    void writeNote(wsPath, record);
  }, [editor, wsPath, writeNote]);

  useDocChange(handleSave, { editor });

  return (
    <ProseKit key={key} editor={editor}>
      <div className="box-border flex h-full min-h-36 w-full flex-col overflow-x-hidden overflow-y-hidden">
        <div className="relative box-border w-full flex-1 overflow-y-scroll">
          <div
            ref={editor.mount}
            className={cx(
              'ProseMirror box-border min-h-full py-8 outline-none outline-0',
              '[&_:not(pre)_code]:rounded-md [&_:not(pre)_code]:bg-muted/40 [&_:not(pre)_code]:px-1.5 [&_:not(pre)_code]:py-0.5 [&_:not(pre)_code]:font-mono',
              "[&_pre]:bg-muted/30 [&_span[data-mention='tag']]:text-primary [&_span[data-mention='user']]:text-accent",
            )}
          />
        </div>
      </div>
    </ProseKit>
  );
}
