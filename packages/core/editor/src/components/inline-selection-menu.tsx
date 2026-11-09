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
import {
  isSelectionAllHeadings,
  isSelectionAllTopLevelParagraphs,
  setParagraphInSelection,
  toggleHeadingInSelection,
} from '../block-format';
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
type EditorState = EditorView['state'];
type LinkSession = {
  editingLink: boolean;
  initialHref: string;
};

const HEADING_LEVELS = [1, 2, 3] as const;

const HEADING_ICONS: Record<(typeof HEADING_LEVELS)[number], typeof Heading1> =
  {
    1: Heading1,
    2: Heading2,
    3: Heading3,
  };

// Read lazily: `t` is installed on the global at bootstrap, after module load.
const HEADING_LABELS: Record<(typeof HEADING_LEVELS)[number], () => string> = {
  1: () => t.app.editor.selectionMenu.heading1,
  2: () => t.app.editor.selectionMenu.heading2,
  3: () => t.app.editor.selectionMenu.heading3,
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

  // Availability is a dry-run of each command, so a control is enabled only
  // when clicking it would actually change the document. Recomputed per editor
  // state rather than per render: the selection-menu atom hands back a fresh
  // object on every view update, and the list dry-runs walk the whole selection
  // — together that made a select-all in a long note re-scan it on each render.
  const blockState = React.useMemo(() => {
    const state = editorView.state;
    return {
      paragraphActive: isSelectionAllTopLevelParagraphs(state),
      paragraphEnabled: setParagraphInSelection(state),
      headings: HEADING_LEVELS.map((level) => ({
        level,
        active: isSelectionAllHeadings(state, level),
        enabled: toggleHeadingInSelection(level)(state),
      })),
      bulletActive: ext.list.query.isBulletListActive(state),
      bulletEnabled: ext.list.command.toggleBulletList(state),
      orderedActive: ext.list.query.isOrderedListActive(state),
      orderedEnabled: ext.list.command.toggleOrderedList(state),
      taskActive: ext.list.query.isTaskListActive(state),
      taskEnabled: ext.list.command.toggleTaskList(state),
    };
  }, [editorView.state, ext]);

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
        // Wrap rather than overflow: on a narrow viewport the max-width clamp
        // (see the wrapper's `max-w-[calc(100vw-1rem)]`) would otherwise push
        // the trailing controls off-screen and force horizontal page scroll.
        className="flex flex-wrap items-center gap-0.5 rounded-md border bg-popover p-0.5 shadow-xs"
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
            // Pressed when the selection is already plain top-level paragraphs.
            // Disabled tracks the command's own dry-run, so a selection it
            // cannot change (inside a table cell, say) is not offered.
            active={blockState.paragraphActive}
            disabled={!blockState.paragraphEnabled}
            label={t.app.editor.selectionMenu.paragraph}
            onToggle={() => runCommand(editorView, setParagraphInSelection)}
          >
            <Pilcrow />
          </FormatToggle>
          {blockState.headings.map(({ active, enabled, level }) => {
            const HeadingIcon = HEADING_ICONS[level];
            return (
              <FormatToggle
                active={active}
                disabled={!enabled}
                key={level}
                label={HEADING_LABELS[level]()}
                onToggle={() =>
                  runCommand(editorView, toggleHeadingInSelection(level))
                }
              >
                <HeadingIcon />
              </FormatToggle>
            );
          })}
          <FormatToggle
            active={blockState.bulletActive}
            disabled={!blockState.bulletEnabled}
            label={t.app.editor.selectionMenu.bulletList}
            onToggle={() =>
              runCommand(editorView, ext.list.command.toggleBulletList)
            }
          >
            <List />
          </FormatToggle>
          <FormatToggle
            active={blockState.orderedActive}
            disabled={!blockState.orderedEnabled}
            label={t.app.editor.selectionMenu.orderedList}
            onToggle={() =>
              runCommand(editorView, ext.list.command.toggleOrderedList)
            }
          >
            <ListOrdered />
          </FormatToggle>
          <FormatToggle
            active={blockState.taskActive}
            disabled={!blockState.taskEnabled}
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
