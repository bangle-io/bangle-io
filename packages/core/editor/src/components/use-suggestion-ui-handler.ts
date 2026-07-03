import {
  $suggestionUi,
  type EditorView,
  type SuggestionUiHandlers,
} from '@bangle.io/prosemirror-plugins';
import { useSetAtom } from 'jotai';
import { useEffect } from 'react';

export function useSuggestionUiHandler({
  active,
  editorView,
  handler,
  markName,
}: {
  active: boolean;
  editorView: EditorView | undefined;
  handler: SuggestionUiHandlers[string];
  markName: string;
}) {
  const setSuggestionUi = useSetAtom($suggestionUi);

  useEffect(() => {
    if (!editorView || !active) {
      return;
    }

    setSuggestionUi((existing) => {
      const next = new Map(existing);
      next.set(editorView, {
        ...(next.get(editorView) ?? {}),
        [markName]: handler,
      });
      return next;
    });

    return () => {
      setSuggestionUi((existing) => {
        const next = new Map(existing);
        const handlers = { ...(next.get(editorView) ?? {}) };
        delete handlers[markName];
        if (Object.keys(handlers).length) {
          next.set(editorView, handlers);
        } else {
          next.delete(editorView);
        }
        return next;
      });
    };
  }, [active, editorView, handler, markName, setSuggestionUi]);
}
