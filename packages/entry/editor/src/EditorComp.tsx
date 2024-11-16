import React, { useEffect, useRef, useState } from 'react';

import { createEditor } from './editor';

export function EditorComp({
  wsPath,
  readNote,
  writeNote,
}: {
  wsPath: string;
  readNote: (wsPath: string) => Promise<string | undefined>;
  writeNote: (wsPath: string, content: string) => Promise<void>;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const [initialMdContent, updateInitialMdContent] = useState<
    string | undefined
  >(undefined);

  useEffect(() => {
    void readNote(wsPath).then((content) => {
      updateInitialMdContent(content);
    });
  }, [wsPath, readNote]);

  useEffect(() => {
    if (!ref.current || !initialMdContent) {
      return;
    }

    const el = document.querySelector('.B-app-main-content');

    if (!el) {
      throw new Error('Could not find .B-app-main-content');
    }

    const editor = createEditor(ref.current, initialMdContent, (md) => {
      void writeNote(wsPath, md);
    });

    const handleFocus = () => {
      if (editor.view.hasFocus()) {
        return;
      }
      editor.view.focus();
    };

    el.addEventListener('touchstart', handleFocus, { passive: true });
    el.addEventListener('click', handleFocus, { passive: true });

    return () => {
      el.removeEventListener('touchstart', handleFocus);
      el.removeEventListener('click', handleFocus);
      editor.destroy();
    };
  }, [initialMdContent, wsPath, writeNote]);

  return <div ref={ref} />;
}
