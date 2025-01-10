import { cx } from '@bangle.io/base-utils';
import { useCoreServices } from '@bangle.io/context';
import { $linkMenu } from '@bangle.io/prosemirror-plugins';
import {
  Input,
  ToggleGroup,
  ToggleGroupItem,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@bangle.io/ui-components';
import { useAtomValue } from 'jotai';
import { Check, Copy, ExternalLink, Unlink } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import {
  FLOATING_INITIAL_STYLE,
  useFloatingPosition,
} from './use-floating-position';

function isValidUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * LinkMenu: A floating UI for editing or clearing a link,
 * displayed whenever $linkMenu.show is true.
 */
export function LinkMenu({ editorName }: { editorName: string }) {
  const linkMenu = useAtomValue($linkMenu);
  const { pmEditorService } = useCoreServices();
  const editorView = pmEditorService.getEditor(editorName);
  const ext = pmEditorService.extensions;

  const [editHref, setHref] = useState(() => {
    if (!editorView) {
      return '';
    }
    return ext.link.query.getLinkDetails(editorView.state)?.href || '';
  });

  // Update link in editor as href changes, but only if it's a valid URL
  useEffect(() => {
    if (!editorView || !editHref || !isValidUrl(editHref)) {
      return;
    }

    const currentHref = ext.link.query.getLinkDetails(editorView.state)?.href;
    if (currentHref !== editHref) {
      ext.link.command.updateLink(editHref)(
        editorView.state,
        editorView.dispatch,
        editorView,
      );
    }
  }, [editHref, editorView, ext.link]);

  const dismissAtom = ext.linkMenu.command.dismissLinkMenu;

  // Position the floating UI near the link
  const menuRef = useFloatingPosition({
    show: true,
    anchorEl: () => linkMenu?.anchorEl() ?? null,
    boundarySelector: '.ProseMirror:not([contenteditable="false"])',
  });

  const handleClearLink = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!editorView || editorView.isDestroyed) {
      return;
    }
    e.preventDefault();
    editorView?.focus();

    ext.link.command.updateLink(undefined)(
      editorView.state,
      editorView.dispatch,
      editorView,
    );
  };

  const handleUpdateLink = () => {
    if (!editorView || editorView.isDestroyed || !isValidUrl(href)) {
      return;
    }
    ext.link.command.updateLink(href)(
      editorView.state,
      editorView.dispatch,
      editorView,
    );
  };

  const handleCopyLink = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    editorView?.focus();
    navigator.clipboard.writeText(href);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const dismiss = () => {
    if (!editorView) {
      return;
    }
    dismissAtom()(editorView.state, editorView.dispatch);
  };

  const [copySuccess, setCopySuccess] = useState(false);

  // Update link and clear state when menu is dismissed
  useEffect(() => {
    if (!linkMenu?.show) {
      if (editHref && isValidUrl(editHref) && editorView) {
        ext.link.command.updateLink(editHref)(
          editorView.state,
          editorView.dispatch,
          editorView,
        );
      }
      setHref('');
    }
  }, [linkMenu?.show, editHref, editorView, ext.link]);

  // If no editorView or linkMenu not showing, hide component.
  if (!editorView || !linkMenu?.show) {
    return null;
  }

  const href =
    editHref || ext.link.query.getLinkDetails(editorView.state)?.href || '';

  return (
    <div ref={menuRef} style={FLOATING_INITIAL_STYLE}>
      <div className="flex items-center gap-0.5 rounded-md border bg-popover p-0.5 shadow-sm ring-offset-background transition-all duration-100 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
        <Input
          value={
            href || ext.link.query.getLinkDetails(editorView.state)?.href || ''
          }
          onChange={(e) => setHref(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && isValidUrl(href)) {
              handleUpdateLink();
              dismiss();
            }
            if (e.key === 'Escape') {
              dismiss();
            }
          }}
          className={`h-7 min-w-[200px] border-0 bg-transparent px-2 focus-visible:ring-0 focus-visible:ring-offset-0 ${!isValidUrl(href) && href ? 'text-destructive placeholder:text-destructive/50' : ''}`}
          placeholder="Enter link URL..."
        />

        <TooltipProvider delayDuration={300}>
          <ToggleGroup type="single" className="flex gap-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <ToggleGroupItem
                  value="copy"
                  size="sm"
                  className={cx(
                    'h-7 w-7 p-0',
                    copySuccess ? 'hover:bg-transparent' : '',
                  )}
                  onMouseDown={handleCopyLink}
                  disabled={!isValidUrl(href)}
                >
                  {copySuccess ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </ToggleGroupItem>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {copySuccess ? 'Copied!' : 'Copy link'}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <ToggleGroupItem
                  value="open"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => window.open(href, '_blank')}
                  disabled={!isValidUrl(href)}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </ToggleGroupItem>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Open link
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <ToggleGroupItem
                  value="clear"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onMouseDown={handleClearLink}
                >
                  <Unlink className="h-3.5 w-3.5" />
                </ToggleGroupItem>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Clear link
              </TooltipContent>
            </Tooltip>
          </ToggleGroup>
        </TooltipProvider>
      </div>
    </div>
  );
}
