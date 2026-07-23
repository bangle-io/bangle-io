import {
  $selectionMenu,
  type Command,
  type SelectionMenuState,
} from '@bangle.io/prosemirror-plugins';
import {
  Button,
  Separator,
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
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Link as LinkIcon,
  List,
  ListChecks,
  ListOrdered,
  Pilcrow,
  Strikethrough,
} from 'lucide-react';
import React, { useRef, useState } from 'react';
import type { PmEditorService } from '../pm-editor-service';
import { useEditorCoreServices } from '../use-editor-core-services';
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
  const { editorEngine } = useEditorCoreServices();
  const editorView = editorEngine.getEditor(editorName);
  const selectionMenu = editorView ? selectionMenus.get(editorView) : undefined;

  if (!selectionMenu || !editorView) {
    return null;
  }

  return (
    <InlineSelectionMenuContent
      anchorEl={selectionMenu.anchorEl}
      editorView={editorView}
      ext={editorEngine.extensions}
      onOpen={(href) => editorEngine.openLink(editorView, href)}
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
        <TooltipProvider delay={300}>
          <FormatToggle
            active={ext.bold.query.isBoldActive(editorView.state)}
            disabled={!ext.bold.command.toggleBold(editorView.state)}
            label={t.app.editor.selectionMenu.bold}
            onToggle={() => runCommand(editorView, ext.bold.command.toggleBold)}
          >
            <Bold />
          </FormatToggle>
          <FormatToggle
            active={ext.italic.query.isItalicActive(editorView.state)}
            disabled={!ext.italic.command.toggleItalic(editorView.state)}
            label={t.app.editor.selectionMenu.italic}
            onToggle={() =>
              runCommand(editorView, ext.italic.command.toggleItalic)
            }
          >
            <Italic />
          </FormatToggle>
          <FormatToggle
            active={ext.strike.query.isStrikeActive(editorView.state)}
            disabled={!ext.strike.command.toggleStrike(editorView.state)}
            label={t.app.editor.selectionMenu.strike}
            onToggle={() =>
              runCommand(editorView, ext.strike.command.toggleStrike)
            }
          >
            <Strikethrough />
          </FormatToggle>
          <FormatToggle
            active={ext.code.query.isCodeActive(editorView.state)}
            disabled={!ext.code.command.toggleCode(editorView.state)}
            label={t.app.editor.selectionMenu.inlineCode}
            onToggle={() => runCommand(editorView, ext.code.command.toggleCode)}
          >
            <Code />
          </FormatToggle>
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
          <Separator className="mx-0.5 h-6" orientation="vertical" />
          <FormatToggle
            // Highlight only a plain top-level paragraph. `isParagraph` also
            // matches the paragraph nested inside a list item or blockquote,
            // which would light this up alongside the list/quote control.
            active={ext.paragraph.query.isTopLevelParagraph(editorView.state)}
            disabled={false}
            label={t.app.editor.selectionMenu.paragraph}
            onToggle={() =>
              runCommand(editorView, ext.paragraph.command.convertToParagraph)
            }
          >
            <Pilcrow />
          </FormatToggle>
          <FormatToggle
            active={ext.heading.query.isHeadingActive(editorView.state, 1)}
            disabled={!ext.heading.command.toggleHeading(1)(editorView.state)}
            label={t.app.editor.selectionMenu.heading1}
            onToggle={() =>
              runCommand(editorView, ext.heading.command.toggleHeading(1))
            }
          >
            <Heading1 />
          </FormatToggle>
          <FormatToggle
            active={ext.heading.query.isHeadingActive(editorView.state, 2)}
            disabled={!ext.heading.command.toggleHeading(2)(editorView.state)}
            label={t.app.editor.selectionMenu.heading2}
            onToggle={() =>
              runCommand(editorView, ext.heading.command.toggleHeading(2))
            }
          >
            <Heading2 />
          </FormatToggle>
          <FormatToggle
            active={ext.heading.query.isHeadingActive(editorView.state, 3)}
            disabled={!ext.heading.command.toggleHeading(3)(editorView.state)}
            label={t.app.editor.selectionMenu.heading3}
            onToggle={() =>
              runCommand(editorView, ext.heading.command.toggleHeading(3))
            }
          >
            <Heading3 />
          </FormatToggle>
          <FormatToggle
            active={ext.list.query.isBulletListActive(editorView.state)}
            disabled={!ext.list.command.toggleBulletList(editorView.state)}
            label={t.app.editor.selectionMenu.bulletList}
            onToggle={() =>
              runCommand(editorView, ext.list.command.toggleBulletList)
            }
          >
            <List />
          </FormatToggle>
          <FormatToggle
            active={ext.list.query.isOrderedListActive(editorView.state)}
            disabled={!ext.list.command.toggleOrderedList(editorView.state)}
            label={t.app.editor.selectionMenu.orderedList}
            onToggle={() =>
              runCommand(editorView, ext.list.command.toggleOrderedList)
            }
          >
            <ListOrdered />
          </FormatToggle>
          <FormatToggle
            active={ext.list.query.isTaskListActive(editorView.state)}
            disabled={!ext.list.command.toggleTaskList(editorView.state)}
            label={t.app.editor.selectionMenu.taskList}
            onToggle={() =>
              runCommand(editorView, ext.list.command.toggleTaskList)
            }
          >
            <ListChecks />
          </FormatToggle>
        </TooltipProvider>
      </div>
    </div>
  );
}

function runCommand(editorView: EditorView, command: Command) {
  command(editorView.state, editorView.dispatch, editorView);
  editorView.focus();
}

function FormatToggle({
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
      <TooltipTrigger
        render={
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
        }
      />
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
      <TooltipTrigger
        render={
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
        }
      />
      <TooltipContent side="bottom" className="text-xs">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
