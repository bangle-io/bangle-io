import type {
  EditorState,
  Command as PMCommand,
} from '@bangle.io/prosemirror-plugins';
import {
  addMonths,
  addWeeks,
  format,
  startOfMonth,
  startOfWeek,
  subDays,
} from 'date-fns';
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
  Sigma,
  Table,
  Type,
  Upload,
} from 'lucide-react';

import type { setupExtensions } from '../extensions';
import { isTableActionAvailable, TABLE_ACTIONS } from './table-actions';

type EditorExtensions = ReturnType<typeof setupExtensions>;

type SlashMenuItem = {
  /** cmdk filter value: canonical id followed by search aliases. */
  value: string;
  title: string;
  description?: string;
  icon: LucideIcon;
  onSelect: () => void;
};

export type SlashMenuGroup = {
  heading: string;
  items: SlashMenuItem[];
};

/**
 * How the menu executes a selection; supplied by the menu component because
 * execution is tied to the live editor view and the active suggestion mark
 * (dismissing the `/query` text is part of the same interaction).
 */
export type SlashMenuActions = {
  run: (command: PMCommand, opts?: { refocus?: boolean }) => void;
  insertText: (text: string) => void;
  openDatePicker: () => void;
  openFilePicker?: () => void;
};

/**
 * Match plainly instead of cmdk's fuzzy scorer: fuzzy matching lets scattered
 * letters ("date" inside "heading-1 h1 title large") outrank the item whose
 * name is literally the query. Values start with the canonical id followed by
 * alias words, so prefix > word-prefix > substring covers every useful hit.
 */
export function slashMenuFilter(value: string, search: string): number {
  const query = search.toLowerCase().trim();
  if (!query) {
    return 1;
  }
  const haystack = value.toLowerCase();
  if (haystack.startsWith(query)) {
    return 1;
  }
  if (haystack.split(/[\s-]+/).some((word) => word.startsWith(query))) {
    return 0.8;
  }
  if (haystack.includes(query)) {
    return 0.5;
  }
  return 0;
}

/**
 * The slash menu's item registry. Items execute through the banger-editor
 * extension commands (`ext.*`) — the same single source of behavior other
 * surfaces (keybindings, omni-search editor commands) call.
 */
export function buildSlashMenuGroups(
  ext: EditorExtensions,
  state: EditorState,
  actions: SlashMenuActions,
): SlashMenuGroup[] {
  const { run, insertText, openDatePicker, openFilePicker } = actions;
  const labels = t.app.editor.slashCommand;

  const timeGroup: SlashMenuGroup = {
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
        onSelect: () => insertText(format(new Date(), 'PP')),
      },
      {
        value: 'yesterday',
        title: labels.yesterday,
        description: labels.yesterdayDesc,
        icon: History,
        onSelect: () => insertText(format(subDays(new Date(), 1), 'PP')),
      },
      {
        value: 'next-week',
        title: labels.nextWeek,
        description: labels.nextWeekDesc,
        icon: CalendarClock,
        onSelect: () =>
          insertText(format(startOfWeek(addWeeks(new Date(), 1)), 'PPP')),
      },
      {
        value: 'next-month',
        title: labels.nextMonth,
        description: labels.nextMonthDesc,
        icon: CalendarClock,
        onSelect: () =>
          insertText(format(startOfMonth(addMonths(new Date(), 1)), 'PP')),
      },
    ],
  };

  const assetGroups: SlashMenuGroup[] = openFilePicker
    ? [
        {
          heading: labels.groupAssets,
          items: [
            {
              value: 'upload-file asset attachment image media',
              title: labels.uploadFile,
              description: labels.uploadFileDesc,
              icon: Upload,
              onSelect: openFilePicker,
            },
          ],
        },
      ]
    : [];

  // Inside a table the block transforms don't apply (cells hold inline
  // content only), so the menu switches to the shared table actions —
  // gated by the same command dry-run the hover table menu uses, so e.g.
  // "Add row above" disappears in the header row instead of no-oping.
  if (ext.table.query.isTableActive(state)) {
    return [
      {
        heading: labels.groupTable,
        items: TABLE_ACTIONS.filter((action) =>
          isTableActionAvailable(action, ext, state),
        ).map((action) => ({
          value: `${action.id} ${action.keywords}`,
          title: action.title(),
          icon: action.icon,
          onSelect: () => run(action.command(ext)),
        })),
      },
      ...assetGroups,
      timeGroup,
    ];
  }

  return [
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
        {
          value: 'math-block equation latex tex',
          title: labels.mathBlock,
          description: labels.mathBlockDesc,
          icon: Sigma,
          onSelect: () => run(ext.math.command.insertDisplayMath()),
        },
        ...(!ext.frontmatter.query.hasFrontmatter(state)
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
    ...assetGroups,
    timeGroup,
  ];
}
