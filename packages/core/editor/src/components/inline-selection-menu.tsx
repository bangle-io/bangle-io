import { useCoreServices } from '@bangle.io/context';
import {
  $selectionMenu,
  type Command,
  type SelectionMenuState,
} from '@bangle.io/prosemirror-plugins';
import {
  Button,
  Toggle,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@bangle.io/ui-components';
import { useAtomValue } from 'jotai';
import {
  Bold,
  Code,
  Italic,
  Link as LinkIcon,
  Strikethrough,
} from 'lucide-react';
import React, { useRef, useState } from 'react';
import type { PmEditorService } from '../pm-editor-service';
import {
  FloatingLinkEditor,
  type FloatingLinkEditorCloseReason,
} from './floating-link-editor';
import {
  FLOATING_INITIAL_STYLE,
  useFloatingPosition,
} from './use-floating-position';
import { useOutsidePointer } from './use-outside-pointer';

type Extensions = PmEditorService['extensions'];
type EditorView = NonNullable<ReturnType<PmEditorService['getEditor']>>;
type LinkSession = {
  editingLink: boolean;
  initialHref: string;
};

export function InlineSelectionMenu({ editorName }: { editorName: string }) {
  const selectionMenus = useAtomValue($selectionMenu);
  const { pmEditorService } = useCoreServices();
  const editorView = pmEditorService.getEditor(editorName);
  const selectionMenu = editorView ? selectionMenus.get(editorView) : undefined;

  if (!selectionMenu || !editorView) {
    return null;
  }

  return (
    <InlineSelectionMenuContent
      anchorEl={selectionMenu.anchorEl}
      editorView={editorView}
      ext={pmEditorService.extensions}
      onOpen={(href) => pmEditorService.openLink(editorView, href)}
    />
  );
}

function InlineSelectionMenuContent({
  anchorEl,
  editorView,
  ext,
  onOpen,
}: {
  anchorEl: NonNullable<SelectionMenuState>['anchorEl'];
  editorView: EditorView;
  ext: Extensions;
  onOpen: (href: string) => void;
}) {
  const [linkSession, setLinkSession] = useState<LinkSession>();
  const toolbarPopupRef = useRef<HTMLDivElement | null>(null);
  const toolbarRef = useFloatingPosition({
    show: !linkSession,
    anchorEl,
    boundaryElement: editorView.dom,
    placement: 'top',
    inline: true,
  });

  const setToolbarRefs = (node: HTMLDivElement | null) => {
    toolbarPopupRef.current = node;
    toolbarRef.current = node;
  };

  const dismiss = (focus = true) => {
    ext.selectionMenu.command.dismissSelectionMenu()(
      editorView.state,
      editorView.dispatch,
      editorView,
    );
    setLinkSession(undefined);
    if (focus) {
      editorView.focus();
    }
  };

  const closeLinkEditor = (reason: FloatingLinkEditorCloseReason) => {
    if (reason === 'outside') {
      dismiss(false);
    } else {
      setLinkSession(undefined);
    }
  };

  useOutsidePointer({
    enabled: !linkSession,
    ownerDocument: editorView.dom.ownerDocument,
    popupRef: toolbarPopupRef,
    onOutside: dismiss,
  });

  return linkSession ? (
    <FloatingLinkEditor
      anchorEl={anchorEl}
      autoFocus
      editingLink={linkSession.editingLink}
      editorView={editorView}
      ext={ext}
      initialHref={linkSession.initialHref}
      inline
      onOpen={onOpen}
      onClose={closeLinkEditor}
      placement="top"
    />
  ) : (
    <div
      ref={setToolbarRefs}
      className="w-max max-w-[calc(100vw-1rem)]"
      style={FLOATING_INITIAL_STYLE}
    >
      <div
        aria-label={t.app.editor.selectionMenu.label}
        className="flex items-center gap-0.5 rounded-md border bg-popover p-0.5 shadow-xs"
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            dismiss();
          }
        }}
        role="toolbar"
      >
        <TooltipProvider delayDuration={300}>
          <MarkToggle
            active={ext.bold.query.isBoldActive(editorView.state)}
            disabled={!ext.bold.command.toggleBold(editorView.state)}
            label={t.app.editor.selectionMenu.bold}
            onToggle={() => runCommand(editorView, ext.bold.command.toggleBold)}
          >
            <Bold />
          </MarkToggle>
          <MarkToggle
            active={ext.italic.query.isItalicActive(editorView.state)}
            disabled={!ext.italic.command.toggleItalic(editorView.state)}
            label={t.app.editor.selectionMenu.italic}
            onToggle={() =>
              runCommand(editorView, ext.italic.command.toggleItalic)
            }
          >
            <Italic />
          </MarkToggle>
          <MarkToggle
            active={ext.strike.query.isStrikeActive(editorView.state)}
            disabled={!ext.strike.command.toggleStrike(editorView.state)}
            label={t.app.editor.selectionMenu.strike}
            onToggle={() =>
              runCommand(editorView, ext.strike.command.toggleStrike)
            }
          >
            <Strikethrough />
          </MarkToggle>
          <MarkToggle
            active={ext.code.query.isCodeActive(editorView.state)}
            disabled={!ext.code.command.toggleCode(editorView.state)}
            label={t.app.editor.selectionMenu.inlineCode}
            onToggle={() => runCommand(editorView, ext.code.command.toggleCode)}
          >
            <Code />
          </MarkToggle>
          <ToolbarButton
            disabled={
              !ext.link.query.linkAllowedInRange(
                editorView.state,
                editorView.state.selection.from,
                editorView.state.selection.to,
              )
            }
            label={t.app.editor.selectionMenu.link}
            onClick={() => {
              const range = ext.link.query.getLinkRangeAtSelection(
                editorView.state,
              );
              if (range) {
                ext.link.command.expandLinkSelection(
                  editorView.state,
                  editorView.dispatch,
                  editorView,
                );
              }
              setLinkSession({
                editingLink: Boolean(range),
                initialHref: range?.href ?? '',
              });
            }}
          >
            <LinkIcon />
          </ToolbarButton>
        </TooltipProvider>
      </div>
    </div>
  );
}

function runCommand(editorView: EditorView, command: Command) {
  command(editorView.state, editorView.dispatch, editorView);
  editorView.focus();
}

function MarkToggle({
  active,
  children,
  disabled,
  label,
  onToggle,
}: {
  active: boolean;
  children: React.ReactNode;
  disabled: boolean;
  label: string;
  onToggle: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Toggle
          aria-label={label}
          aria-pressed={active}
          className="h-8 w-8 p-0"
          disabled={disabled}
          onPointerDown={(event) => event.preventDefault()}
          onPressedChange={onToggle}
          pressed={active}
          size="sm"
        >
          {children}
        </Toggle>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

function ToolbarButton({
  children,
  label,
  ...props
}: React.ComponentProps<typeof Button> & { label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          {...props}
          aria-label={label}
          className="h-8 w-8 p-0"
          onPointerDown={(event) => {
            event.preventDefault();
            props.onPointerDown?.(event);
          }}
          size="icon"
          type="button"
          variant="ghost"
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
