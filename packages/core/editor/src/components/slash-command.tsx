import { useCoreServices } from '@bangle.io/context';
import {
  $suggestions,
  Fragment,
  resolveSlashCommandGroups,
  runSlashCommandItem,
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
import { useAtomValue } from 'jotai';
import React, {
  type ReactElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';

import { DATE_SUGGESTION } from '../extensions';
import {
  APP_SLASH_COMMAND_GROUPS,
  type AppSlashCommandGroupId,
  type AppSlashCommandItem,
  appSlashCommands,
} from '../slash-app-commands';
import {
  FLOATING_INITIAL_STYLE,
  useFloatingPosition,
} from './use-floating-position';
import { useSuggestionUiHandler } from './use-suggestion-ui-handler';

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
  const { pmEditorService } = useCoreServices();
  const editorView = pmEditorService.getEditor(editorName);
  const ext = pmEditorService.extensions;
  const suggestion = editorView ? suggestions.get(editorView) : undefined;
  const active =
    suggestion?.markName === 'slash_command' ? suggestion : undefined;
  const query = active?.text.slice(1) ?? '';
  const appItems = useMemo(() => appSlashCommands(), []);
  const commandGroups = useMemo(
    () =>
      editorView && active?.show
        ? resolveSlashCommandGroups({
            extensions: ext,
            view: editorView,
            query,
            position: active.position,
            groupOrder: APP_SLASH_COMMAND_GROUPS,
            items: appItems,
            searchAliases: (item) => [itemLabel(item)],
          })
        : [],
    [active?.position, active?.show, appItems, editorView, ext, query],
  );
  const optionCount = commandGroups.reduce(
    (count, group) => count + group.items.length,
    0,
  );

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
      optionCount,
    }),
    [optionCount],
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

  const runItem = useCallback(
    (item: (typeof commandGroups)[number]['items'][number]) => {
      if (!editorView) {
        return;
      }
      if (item.id === 'date-picker') {
        openDatePicker();
        return;
      }
      dismissCommandUi();
      runSlashCommandItem({
        item,
        view: editorView,
        query,
      });
      editorView.focus();
    },
    [dismissCommandUi, editorView, openDatePicker, query],
  );

  if (!editorView || !active?.show) {
    return null;
  }

  return (
    <div ref={slashRef} style={FLOATING_INITIAL_STYLE}>
      <Command
        ref={commandRef}
        className="overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md"
        shouldFilter={false}
      >
        <CommandInput hidden value={query} onValueChange={() => {}} />
        <CommandEmpty>
          <span className="text-muted-foreground">
            {t.app.editor.slashCommand.nothingFound}
          </span>
        </CommandEmpty>
        <CommandList>
          {commandGroups.map((group, index) => (
            <React.Fragment key={group.id}>
              {index > 0 ? <CommandSeparator /> : null}
              <CommandGroup heading={groupLabel(group.id)}>
                {group.items.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={[
                      item.id,
                      item.label,
                      itemLabel(item),
                      ...(item.keywords ?? []),
                    ].join(' ')}
                    onSelect={() => runItem(item)}
                  >
                    {itemLabel(item)}
                  </CommandItem>
                ))}
              </CommandGroup>
            </React.Fragment>
          ))}
        </CommandList>
        <CommandHints
          hints={[
            t.app.editor.slashCommand.enterToSelect,
            t.app.editor.slashCommand.escapeToDismiss,
          ]}
        />
      </Command>
    </div>
  );
}

function groupLabel(id: AppSlashCommandGroupId): string {
  switch (id) {
    case 'basic':
      return t.app.editor.slashCommand.groupBasic;
    case 'lists':
      return t.app.editor.slashCommand.groupLists;
    case 'table':
      return t.app.editor.slashCommand.groupTable;
    case 'time':
      return t.app.editor.slashCommand.groupTime;
  }
}

function itemLabel(item: AppSlashCommandItem): string {
  const { labelKey } = item;
  switch (labelKey.name) {
    case 'paragraph':
      return t.app.editor.slashCommand.paragraph;
    case 'heading':
      return t.app.editor.slashCommand.heading({ level: labelKey.level });
    case 'codeBlock':
      return t.app.editor.slashCommand.codeBlock;
    case 'table':
      return t.app.editor.slashCommand.table;
    case 'date':
      return t.app.editor.slashCommand.date;
    case 'bulletList':
      return t.app.editor.slashCommand.bulletList;
    case 'numberedList':
      return t.app.editor.slashCommand.numberedList;
    case 'todoList':
      return t.app.editor.slashCommand.todoList;
    case 'today':
      return t.app.editor.slashCommand.today;
    case 'yesterday':
      return t.app.editor.slashCommand.yesterday;
    case 'nextWeek':
      return t.app.editor.slashCommand.nextWeek;
    case 'nextMonth':
      return t.app.editor.slashCommand.nextMonth;
    case 'addRowAbove':
      return t.app.editor.tableMenu.addRowAbove;
    case 'addRowBelow':
      return t.app.editor.tableMenu.addRowBelow;
    case 'addColumnLeft':
      return t.app.editor.tableMenu.addColumnLeft;
    case 'addColumnRight':
      return t.app.editor.tableMenu.addColumnRight;
    case 'deleteRow':
      return t.app.editor.tableMenu.deleteRow;
    case 'deleteColumn':
      return t.app.editor.tableMenu.deleteColumn;
    case 'deleteTable':
      return t.app.editor.tableMenu.deleteTable;
  }
}
