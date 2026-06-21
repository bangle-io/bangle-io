import { useCoreServices } from '@bangle.io/context';
import { $linkMenu, type LinkMenuState } from '@bangle.io/prosemirror-plugins';
import { useAtomValue } from 'jotai';
import React from 'react';
import type { PmEditorService } from '../pm-editor-service';
import {
  FloatingLinkEditor,
  isValidHttpUrl,
  normalizeHttpUrl,
} from './floating-link-editor';

export { isValidHttpUrl, normalizeHttpUrl };

/** Floating link editor for an existing link under a collapsed cursor. */
export function LinkMenu({ editorName }: { editorName: string }) {
  const linkMenus = useAtomValue($linkMenu);
  const { pmEditorService } = useCoreServices();
  const editorView = pmEditorService.getEditor(editorName);
  const linkMenu = editorView ? linkMenus.get(editorView) : undefined;

  if (!editorView || !linkMenu?.show) {
    return null;
  }

  return (
    <CursorLinkMenu
      editorView={editorView}
      ext={pmEditorService.extensions}
      href={linkMenu.href}
      anchorEl={linkMenu.anchorEl}
      key={`${linkMenu.position}:${linkMenu.href}`}
    />
  );
}

function CursorLinkMenu({
  editorView,
  ext,
  href,
  anchorEl,
}: {
  editorView: NonNullable<ReturnType<PmEditorService['getEditor']>>;
  ext: PmEditorService['extensions'];
  href: string;
  anchorEl: LinkMenuState['anchorEl'];
}) {
  return (
    <FloatingLinkEditor
      anchorEl={anchorEl}
      editingLink
      editorView={editorView}
      ext={ext}
      initialHref={href}
      onClose={() => {
        ext.linkMenu.command.dismissLinkMenu()(
          editorView.state,
          editorView.dispatch,
          editorView,
        );
      }}
    />
  );
}
