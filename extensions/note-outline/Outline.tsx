import React, { useCallback, useMemo } from 'react';

import { Selection } from '@bangle.dev/pm';

import { useEditorManagerContext } from '@bangle.io/editor-manager-context';
import { ActionButton, ButtonContent } from '@bangle.io/ui-bangle-button';
import { cx } from '@bangle.io/utils';
import { useWorkspaceContext } from '@bangle.io/workspace-context';

export function Outline() {
  const { openedWsPaths } = useWorkspaceContext();
  const { focusedEditorId, getEditor } = useEditorManagerContext();

  const focusedEditor = useMemo(() => {
    if (typeof focusedEditorId === 'number') {
      const editor = getEditor(focusedEditorId);
      const wsPath = openedWsPaths.getByIndex(focusedEditorId);
      if (editor && wsPath) {
        return { wsPath, editor: editor };
      }
    }
    return undefined;
  }, [openedWsPaths, getEditor, focusedEditorId]);

  const headings = useMemo(() => {
    if (!focusedEditor || focusedEditor.editor.destroyed) {
      return [];
    }
    const editor = focusedEditor.editor;

    const headingNodes: Array<{
      offset: number;
      level: number;
      title: string;
    }> = [];

    editor.view.state.doc.forEach((node, offset, i) => {
      if (node.type.name === 'heading') {
        headingNodes.push({
          offset,
          level: node.attrs.level,
          title: node.textContent,
        });
      }
    });

    return headingNodes.map((r, i) => {
      return {
        uid: i + 'heading',
        title: r.title,
        extraInfo: '#' + r.level,
        level: r.level,
        data: r,
      };
    });
  }, [focusedEditor]);

  const onExecuteItem = useCallback(
    (item: typeof headings[0]) => {
      if (focusedEditor) {
        const { editor } = focusedEditor;

        if (!editor || editor.destroyed) {
          return;
        }
        editor.focusView();
        const { dispatch, state } = editor.view;
        const tr = state.tr;
        dispatch(
          tr
            .setSelection(Selection.near(tr.doc.resolve(item.data.offset)))
            .scrollIntoView(),
        );
      }
    },
    [focusedEditor],
  );

  return (
    <div className="note-outline_container flex flex-col">
      {headings.length === 0 && (
        <span className="font-light">{'<No headings found>'}</span>
      )}
      {headings.map((r) => (
        <ActionButton
          isQuiet="hoverBg"
          ariaLabel={r.title}
          key={r.uid}
          onPress={() => {
            onExecuteItem(r);
          }}
          style={{
            paddingLeft: 12 * (r.level - 1),
            paddingTop: 4,
            paddingBottom: 4,
          }}
        >
          <ButtonContent
            text={r.title || `<Empty heading-${r.level}>`}
            textClassName={cx('text-sm truncate', !r.title && 'font-light')}
          />
        </ActionButton>
      ))}
    </div>
  );
}
