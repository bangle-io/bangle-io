import { cx } from '@bangle.io/base-utils';
import { useCoreServices } from '@bangle.io/context';
import React, { useCallback } from 'react';

export { EditorWService } from './editor-w-service';

/**
 * The Wordgard engine's editing surface (M0b stub: read-only note view).
 * Mirrors the ProseMirror `Editor` component's contract so
 * `EditorSurface` in the app layer can switch between them per engine.
 * The persistent experimental notice keeps the one-click way back to the
 * stable engine visible whenever this engine is active (plans/011).
 */
export function Editor({
  wsPath,
  className,
  name,
}: {
  wsPath: string;
  className?: string;
  name: string;
}) {
  const { editorEngine, commandDispatcher } = useCoreServices();

  return (
    <div className="box-border flex h-full min-h-36 w-full min-w-0 flex-col">
      <div
        role="status"
        className={cx(
          'mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-dashed bg-muted/40 px-3 py-2 text-muted-foreground text-sm',
          className,
        )}
      >
        <span>{t.app.editorW.experimentalNotice}</span>
        <button
          type="button"
          className="font-medium underline underline-offset-2 hover:text-foreground"
          onClick={() => {
            commandDispatcher.dispatch(
              'command::ui:switch-editor-engine',
              null,
              'editor-w:experimental-notice',
            );
          }}
        >
          {t.app.editorW.switchEditor}
        </button>
      </div>
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
            'box-border min-h-full min-w-0 max-w-full whitespace-pre-wrap py-8 font-mono text-sm',
            className,
          )}
        />
      </div>
    </div>
  );
}
