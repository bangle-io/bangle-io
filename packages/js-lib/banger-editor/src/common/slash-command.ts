import type { Command, EditorState, EditorView } from '../pm';
import { Selection } from '../pm';

export const EDITOR_SLASH_COMMAND_GROUPS = ['basic', 'lists', 'table'] as const;

export type EditorSlashCommandGroupId =
  (typeof EDITOR_SLASH_COMMAND_GROUPS)[number];

export type SlashCommandExtensions<TLabel = SlashCommandLabel> = Record<
  string,
  { id: string; slashCommand?: Record<string, SlashCommandItem<TLabel>> }
>;

export type SlashCommandGroup<
  TGroup extends string = string,
  TLabel = SlashCommandLabel,
> = {
  id: TGroup;
  items: SlashCommandItem<TLabel>[];
};

export type SlashCommandContext = {
  state: EditorState;
  view: EditorView;
  query: string;
};

export type SlashCommandLabel =
  | { name: 'paragraph' }
  | { name: 'heading'; level: number }
  | { name: 'codeBlock' }
  | { name: 'table' }
  | { name: 'bulletList' }
  | { name: 'numberedList' }
  | { name: 'todoList' }
  | { name: 'addRowAbove' }
  | { name: 'addRowBelow' }
  | { name: 'addColumnLeft' }
  | { name: 'addColumnRight' }
  | { name: 'deleteRow' }
  | { name: 'deleteColumn' }
  | { name: 'deleteTable' };

export type SlashCommandItem<TLabel = SlashCommandLabel> = {
  id: string;
  group: string;
  labelKey: TLabel;
  label: string;
  keywords?: readonly string[];
  priority?: number;
  canRun: (context: SlashCommandContext) => boolean;
  run: (context: SlashCommandContext) => boolean;
};

export type CommandSlashItemOptions<TLabel = SlashCommandLabel> = {
  id: string;
  group: string;
  labelKey: TLabel;
  label: string;
  keywords?: readonly string[];
  priority?: number;
  command: Command;
  canRun?: (context: SlashCommandContext) => boolean;
};

export function createSlashCommandContext({
  view,
  query,
  position,
}: {
  view: EditorView;
  query: string;
  position?: number;
}): SlashCommandContext {
  return {
    state: stateAtPosition(view.state, position),
    view,
    query,
  };
}

function clampPosition(state: EditorState, position: number): number {
  return Math.max(0, Math.min(position, state.doc.content.size));
}

function stateAtPosition(
  state: EditorState,
  position: number | undefined,
): EditorState {
  if (typeof position !== 'number') {
    return state;
  }
  const selection = Selection.near(
    state.doc.resolve(clampPosition(state, position)),
  );
  if (selection.eq(state.selection)) {
    return state;
  }
  return state.apply(state.tr.setSelection(selection));
}

function extensionSlashCommands<TLabel>(
  extensions: SlashCommandExtensions<TLabel>,
): SlashCommandItem<TLabel>[] {
  return Object.values(extensions).flatMap((extension) =>
    Object.values(extension.slashCommand ?? {}),
  );
}

function matchesQuery<TLabel>({
  item,
  query,
  searchAliases,
}: {
  item: SlashCommandItem<TLabel>;
  query: string;
  searchAliases: readonly string[];
}): boolean {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  return [item.label, item.id, ...searchAliases, ...(item.keywords ?? [])]
    .join(' ')
    .toLocaleLowerCase()
    .includes(normalizedQuery);
}

function groupId<TGroup extends string>(
  groupOrder: readonly TGroup[],
  value: string,
): TGroup | undefined {
  return groupOrder.find((id) => id === value);
}

function assertGroupId<TGroup extends string>(
  groupOrder: readonly TGroup[],
  value: string,
): TGroup {
  const id = groupId(groupOrder, value);
  if (!id) {
    throw new Error(`Unknown slash command group: ${value}`);
  }
  return id;
}

export function resolveSlashCommandGroups<
  TGroup extends string,
  TLabel = SlashCommandLabel,
>({
  extensions,
  view,
  query,
  position,
  groupOrder,
  items = [],
  searchAliases = () => [],
}: {
  extensions: SlashCommandExtensions<TLabel>;
  view: EditorView;
  query: string;
  position?: number;
  groupOrder: readonly TGroup[];
  items?: readonly SlashCommandItem<TLabel>[];
  searchAliases?: (item: SlashCommandItem<TLabel>) => readonly string[];
}): SlashCommandGroup<TGroup, TLabel>[] {
  const context = createSlashCommandContext({ view, query, position });
  const grouped = new Map<TGroup, SlashCommandItem<TLabel>[]>();

  for (const item of [...extensionSlashCommands(extensions), ...items]) {
    const id = assertGroupId(groupOrder, item.group);
    if (
      !matchesQuery({ item, query, searchAliases: searchAliases(item) }) ||
      !item.canRun(context)
    ) {
      continue;
    }

    const groupItems = grouped.get(id) ?? [];
    groupItems.push(item);
    grouped.set(id, groupItems);
  }

  return groupOrder.flatMap((id): SlashCommandGroup<TGroup, TLabel>[] => {
    const groupItems = grouped.get(id);
    if (!groupItems?.length) {
      return [];
    }
    return [
      {
        id,
        items: [...groupItems].sort((a, b) => {
          const priority = (b.priority ?? 0) - (a.priority ?? 0);
          return priority === 0 ? a.label.localeCompare(b.label) : priority;
        }),
      },
    ];
  });
}

export function runSlashCommandItem<TLabel = SlashCommandLabel>({
  item,
  view,
  query,
}: {
  item: SlashCommandItem<TLabel>;
  view: EditorView;
  query: string;
}): boolean {
  const context = createSlashCommandContext({ view, query });
  if (!item.canRun(context)) {
    return false;
  }
  return item.run(context);
}

export function canRunCommand(
  command: Command,
  context: SlashCommandContext,
): boolean {
  return command(context.state, undefined);
}

export function runCommand(
  command: Command,
  context: SlashCommandContext,
): boolean {
  return command(context.state, context.view.dispatch, context.view);
}

function selectionParentIsBlockNode(context: SlashCommandContext): boolean {
  const group = context.state.selection.$from.parent.type.spec.group;
  return group?.split(/\s+/).includes('block') ?? false;
}

export function commandSlashItem({
  id,
  group,
  labelKey,
  label,
  keywords,
  priority,
  command,
  canRun,
}: CommandSlashItemOptions): SlashCommandItem {
  return {
    id,
    group,
    labelKey,
    label,
    keywords,
    priority,
    canRun: (context) =>
      (canRun?.(context) ?? true) && canRunCommand(command, context),
    run: (context) => runCommand(command, context),
  };
}

export function blockCommandSlashItem(
  options: Omit<CommandSlashItemOptions, 'canRun'>,
): SlashCommandItem {
  return commandSlashItem({
    ...options,
    canRun: selectionParentIsBlockNode,
  });
}
