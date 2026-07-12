import {
  $suggestions,
  Fragment,
  type Command as PMCommand,
} from '@bangle.io/prosemirror-plugins';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandHints,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@bangle.io/ui-components';
import {
  addMonths,
  addWeeks,
  format,
  startOfMonth,
  startOfWeek,
  subDays,
} from 'date-fns';
import { useAtomValue } from 'jotai';
import {
  Calendar,
  CalendarClock,
  CalendarDays,
  Code,
  FileText,
  Heading1,
  Heading2,
  Heading3,
  History,
  List,
  ListChecks,
  ListOrdered,
  type LucideIcon,
  Table,
  Type,
} from 'lucide-react';
import React, {
  type ReactElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';

import { DATE_SUGGESTION } from '../extensions';
import { useEditorCoreServices } from '../use-editor-core-services';
import {
  FLOATING_INITIAL_STYLE,
  useFloatingPosition,
} from './use-floating-position';
import { useSuggestionUiHandler } from './use-suggestion-ui-handler';

type SlashItem = {
  /** cmdk filter value: canonical id plus search aliases. */
  value: string;
  title: string;
  description: string;
  icon: LucideIcon;
  onSelect: () => void;
};

type SlashGroup = {
  heading: string;
  items: SlashItem[];
};

function SlashCommandItem({ item }: { item: SlashItem }) {
  const Icon = item.icon;
  return (
    <CommandItem value={item.value} onSelect={item.onSelect}>
      <div className="flex size-8 shrink-0 items-center justify-center rounded-md border bg-background text-muted-foreground">
        <Icon aria-hidden />
      </div>
      <div className="flex min-w-0 flex-col">
        <span className="truncate">{item.title}</span>
        <span className="truncate text-muted-foreground text-xs">
          {item.description}
        </span>
      </div>
    </CommandItem>
  );
}

/**
 * SlashCommand displays a floating "slash" menu when the user is inside
 * the suggestion mark that triggers the slash command.
 */
export function SlashCommand({
  editorName,
}: {
  editorName: string;
}): ReactElement | null {
  const suggestions = useAtomValue($suggestions);
  const commandRef = useRef<HTMLDivElement>(null);
  const prevSelectedIndexRef = useRef<number>(0);
  const { editorEngine } = useEditorCoreServices();
  const editorView = editorEngine.getEditor(editorName);
  const suggestion = editorView ? suggestions.get(editorView) : undefined;
  const active =
    suggestion?.markName === 'slash_command' ? suggestion : undefined;

  // Add effect to watch selectedIndex changes
  useEffect(() => {
    const selectedIndex = active?.selectedIndex ?? 0;
    const prevIndex = prevSelectedIndexRef.current;

    // Well cmdk isnt the best maintained library, so we need to manually
    // wire up the keyboard navigation.
    if (selectedIndex !== prevIndex && commandRef.current) {
      const key = selectedIndex > prevIndex ? 'ArrowDown' : 'ArrowUp';
      const event = new KeyboardEvent('keydown', {
        key,
        cancelable: true,
        bubbles: true,
      });
      commandRef.current.dispatchEvent(event);
    }

    prevSelectedIndexRef.current = selectedIndex;
  }, [active?.selectedIndex]);

  const slashCommandUiHandler = useMemo(
    () => ({
      onSelect: () => {
        if (commandRef.current) {
          const event = new KeyboardEvent('keydown', {
            key: 'Enter',
            cancelable: true,
            bubbles: true,
          });
          commandRef.current.dispatchEvent(event);
        }
      },
    }),
    [],
  );

  useSuggestionUiHandler({
    active: Boolean(active),
    editorView,
    handler: slashCommandUiHandler,
    markName: 'slash_command',
  });

  const slashRef = useFloatingPosition({
    show: Boolean(active?.show),
    anchorEl: () => active?.anchorEl() ?? null,
    boundarySelector: '.ProseMirror:not([contenteditable="false"])',
  });

  const ext = editorEngine.extensions;

  const dismissCommandUi = useCallback(() => {
    if (!editorView || !active) {
      return;
    }

    ext.suggestions.command.replaceSuggestMarkWith({
      content: '',
    })(editorView.state, editorView.dispatch, editorView);
  }, [editorView, active, ext]);

  const openDatePicker = useCallback(() => {
    if (!editorView || !active) {
      return;
    }

    // Swap the slash mark for the date trigger text carrying the
    // `date_suggestion` mark — the same document state as if the user had
    // typed the trigger — so the DatePickerMenu surface takes over.
    const { schema } = editorView.state;
    const mark = schema.mark(DATE_SUGGESTION.markName, {
      trigger: DATE_SUGGESTION.trigger,
    });
    ext.suggestions.command.replaceSuggestMarkWith({
      content: Fragment.from(schema.text(DATE_SUGGESTION.trigger, [mark])),
    })(editorView.state, editorView.dispatch, editorView);
  }, [editorView, active, ext]);

  if (!editorView || !active?.show) {
    return null;
  }

  const run = (command: PMCommand, { refocus }: { refocus?: boolean } = {}) => {
    dismissCommandUi();
    command(editorView.state, editorView.dispatch, editorView);
    if (refocus) {
      // Some inserts replace or move the focused block, dropping DOM focus;
      // restore it so typing continues in the new block.
      editorView.focus();
    }
  };

  const insertDateText = (text: string) => {
    run(ext.base.command.insertText({ text }));
  };

  const labels = t.app.editor.slashCommand;

  const groups: SlashGroup[] = [
    {
      heading: labels.groupBasic,
      items: [
        {
          value: 'paragraph text plain body',
          title: labels.paragraph,
          description: labels.paragraphDesc,
          icon: Type,
          onSelect: () => run(ext.paragraph.command.convertToParagraph),
        },
        {
          value: 'heading-1 h1 title large',
          title: labels.heading1,
          description: labels.heading1Desc,
          icon: Heading1,
          onSelect: () => run(ext.heading.command.toggleHeading(1)),
        },
        {
          value: 'heading-2 h2 subtitle medium',
          title: labels.heading2,
          description: labels.heading2Desc,
          icon: Heading2,
          onSelect: () => run(ext.heading.command.toggleHeading(2)),
        },
        {
          value: 'heading-3 h3 small',
          title: labels.heading3,
          description: labels.heading3Desc,
          icon: Heading3,
          onSelect: () => run(ext.heading.command.toggleHeading(3)),
        },
        {
          value: 'code-block code fenced-code snippet',
          title: labels.codeBlock,
          description: labels.codeBlockDesc,
          icon: Code,
          onSelect: () => run(ext.codeBlock.command.toggleCodeBlock),
        },
        ...(!ext.frontmatter.query.hasFrontmatter(editorView.state)
          ? [
              {
                value: 'frontmatter yaml properties metadata',
                title: labels.frontmatter,
                description: labels.frontmatterDesc,
                icon: FileText,
                onSelect: () =>
                  // Inserting at the doc top moves focus away from the typed
                  // position; restore it so typing lands in the block.
                  run(ext.frontmatter.command.insertFrontmatter, {
                    refocus: true,
                  }),
              },
            ]
          : []),
        {
          value: 'table grid',
          title: labels.table,
          description: labels.tableDesc,
          icon: Table,
          onSelect: () =>
            // Replacing the focused paragraph with the table drops DOM
            // focus; restore it so typing goes into the first cell.
            run(ext.table.command.insertTable(), { refocus: true }),
        },
      ],
    },
    {
      heading: labels.groupLists,
      items: [
        {
          value: 'bullet-list unordered ul',
          title: labels.bulletList,
          description: labels.bulletListDesc,
          icon: List,
          onSelect: () => run(ext.list.command.toggleBulletList),
        },
        {
          value: 'numbered-list ordered ol',
          title: labels.numberedList,
          description: labels.numberedListDesc,
          icon: ListOrdered,
          onSelect: () => run(ext.list.command.toggleOrderedList),
        },
        {
          value: 'todo-list task checkbox checklist',
          title: labels.todoList,
          description: labels.todoListDesc,
          icon: ListChecks,
          onSelect: () => run(ext.list.command.toggleTaskList),
        },
      ],
    },
    {
      heading: labels.groupTime,
      items: [
        {
          value: 'date calendar',
          title: labels.date,
          description: labels.dateDesc,
          icon: Calendar,
          onSelect: openDatePicker,
        },
        {
          value: 'today',
          title: labels.today,
          description: labels.todayDesc,
          icon: CalendarDays,
          onSelect: () => insertDateText(format(new Date(), 'PP')),
        },
        {
          value: 'yesterday',
          title: labels.yesterday,
          description: labels.yesterdayDesc,
          icon: History,
          onSelect: () => insertDateText(format(subDays(new Date(), 1), 'PP')),
        },
        {
          value: 'next-week',
          title: labels.nextWeek,
          description: labels.nextWeekDesc,
          icon: CalendarClock,
          onSelect: () =>
            insertDateText(format(startOfWeek(addWeeks(new Date(), 1)), 'PPP')),
        },
        {
          value: 'next-month',
          title: labels.nextMonth,
          description: labels.nextMonthDesc,
          icon: CalendarClock,
          onSelect: () =>
            insertDateText(
              format(startOfMonth(addMonths(new Date(), 1)), 'PP'),
            ),
        },
      ],
    },
  ];

  return (
    <div ref={slashRef} style={FLOATING_INITIAL_STYLE}>
      <Command
        ref={commandRef}
        data-testid="slash-command-menu"
        className="w-72 overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-lg"
      >
        <CommandInput
          hidden
          value={active.text.slice(1)}
          onValueChange={() => {}}
        />
        <CommandEmpty>
          <span className="text-muted-foreground">{labels.empty}</span>
        </CommandEmpty>
        <CommandList className="max-h-[330px] overscroll-contain">
          {groups.map((group, groupIndex) => (
            <React.Fragment key={group.heading}>
              {groupIndex > 0 && <CommandSeparator />}
              <CommandGroup heading={group.heading}>
                {group.items.map((item) => (
                  <SlashCommandItem key={item.value} item={item} />
                ))}
              </CommandGroup>
            </React.Fragment>
          ))}
        </CommandList>
        <CommandHints hints={[labels.hintSelect, labels.hintDismiss]} />
      </Command>
    </div>
  );
}
