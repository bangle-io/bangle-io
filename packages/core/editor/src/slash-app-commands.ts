import type {
  EditorSlashCommandGroupId,
  SlashCommandItem,
  SlashCommandLabel,
} from '@bangle.io/prosemirror-plugins';
import {
  addMonths,
  addWeeks,
  format,
  startOfMonth,
  startOfWeek,
  subDays,
} from 'date-fns';

export const APP_SLASH_COMMAND_GROUPS = [
  'basic',
  'lists',
  'table',
  'time',
] as const satisfies readonly (EditorSlashCommandGroupId | 'time')[];

export type AppSlashCommandGroupId = (typeof APP_SLASH_COMMAND_GROUPS)[number];

type AppSlashCommandLabel =
  | SlashCommandLabel
  | { name: 'date' }
  | { name: 'today' }
  | { name: 'yesterday' }
  | { name: 'nextWeek' }
  | { name: 'nextMonth' };

export type AppSlashCommandItem = SlashCommandItem<AppSlashCommandLabel>;

function dateCommand({
  id,
  labelKey,
  label,
  keywords,
  priority,
  getText,
}: {
  id: string;
  labelKey: AppSlashCommandItem['labelKey'];
  label: string;
  keywords?: readonly string[];
  priority: number;
  getText: () => string;
}): AppSlashCommandItem {
  return {
    id,
    group: 'time',
    labelKey,
    label,
    keywords,
    priority,
    canRun: (context) => context.state.selection.$from.parent.inlineContent,
    run: (context) => {
      const node = context.state.schema.text(getText());
      context.view.dispatch(
        context.state.tr.replaceSelectionWith(node).scrollIntoView(),
      );
      return true;
    },
  };
}

export function appSlashCommands(): AppSlashCommandItem[] {
  return [
    {
      id: 'date-picker',
      group: 'time',
      labelKey: { name: 'date' },
      label: 'Date',
      keywords: ['calendar'],
      priority: 110,
      canRun: (context) => context.state.selection.$from.parent.inlineContent,
      run: () => false,
    },
    dateCommand({
      id: 'today',
      labelKey: { name: 'today' },
      label: 'Today',
      priority: 100,
      getText: () => format(new Date(), 'PP'),
    }),
    dateCommand({
      id: 'yesterday',
      labelKey: { name: 'yesterday' },
      label: 'Yesterday',
      priority: 90,
      getText: () => format(subDays(new Date(), 1), 'PP'),
    }),
    dateCommand({
      id: 'next-week',
      labelKey: { name: 'nextWeek' },
      label: 'Next week',
      keywords: ['week'],
      priority: 80,
      getText: () => format(startOfWeek(addWeeks(new Date(), 1)), 'PPP'),
    }),
    dateCommand({
      id: 'next-month',
      labelKey: { name: 'nextMonth' },
      label: 'Next month',
      keywords: ['month'],
      priority: 70,
      getText: () => format(startOfMonth(addMonths(new Date(), 1)), 'PP'),
    }),
  ];
}
