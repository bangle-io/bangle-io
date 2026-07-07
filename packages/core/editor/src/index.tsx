import 'prosemirror-view/style/prosemirror.css';
import './typography.css';

import { cx } from '@bangle.io/base-utils';
import { useAtomValue } from 'jotai';
import { TriangleAlert } from 'lucide-react';
import React, { useCallback } from 'react';
import {
  DatePickerMenu,
  InlineSelectionMenu,
  LinkMenu,
  SlashCommand,
  TableMenu,
  WikiLinkMenu,
} from './components';
import { useEditorCoreServices } from './use-editor-core-services';

export { PmEditorService } from './pm-editor-service';
export { useEditorCoreServices } from './use-editor-core-services';
export function Editor({
  wsPath,
  className,
  name,
}: {
  wsPath: string;
  className?: string;
  name: string;
}) {
  const { editorEngine } = useEditorCoreServices();
  const roundTripWarnings = useAtomValue(editorEngine.$roundTripWarnings);
  const showFidelityNotice = roundTripWarnings.has(wsPath);

  return (
    <div className="box-border flex h-full min-h-36 w-full min-w-0 flex-col">
      {showFidelityNotice && (
        <div
          role="status"
          data-testid="editor-fidelity-notice"
          className="mx-4 mt-3 flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-amber-700 text-sm dark:text-amber-400"
        >
          <TriangleAlert aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{t.app.editor.fidelityNotice}</span>
        </div>
      )}
      <div className="relative box-border w-full min-w-0 flex-1">
        <div
          // in react 19 callback change retriggers this callback
          // so we use useCallback to memoize the callback
          ref={useCallback(
            (node: HTMLElement | null) => {
              const cleanup =
                node &&
                editorEngine.mountEditor({
                  domNode: node,
                  wsPath,
                  name,
                });

              return () => {
                cleanup?.();
              };
            },
            [name, wsPath, editorEngine],
          )}
          data-editor-name={name}
          data-editor-engine={editorEngine.engineId}
          className={cx(
            'ProseMirror box-border min-h-full min-w-0 max-w-full py-8 outline-0 outline-hidden',
            '[&_:not(pre)_code]:rounded-md [&_:not(pre)_code]:bg-muted/40 [&_:not(pre)_code]:px-1.5 [&_:not(pre)_code]:py-0.5 [&_:not(pre)_code]:font-mono',
            "[&_pre]:bg-muted/30 [&_span[data-mention='tag']]:text-primary [&_span[data-mention='user']]:text-accent",
            className,
          )}
        />
        <SlashCommand editorName={name} />
        <DatePickerMenu editorName={name} />
        <TableMenu editorName={name} />
        <WikiLinkMenu editorName={name} />
        <LinkMenu editorName={name} />
        <InlineSelectionMenu editorName={name} />
      </div>
    </div>
  );
}
