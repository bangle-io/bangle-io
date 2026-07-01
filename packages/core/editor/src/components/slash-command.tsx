import { useCoreServices } from '@bangle.io/context';
import { $suggestions, $suggestionUi } from '@bangle.io/prosemirror-plugins';
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
import { useAtomValue, useSetAtom } from 'jotai';
import React, {
  type ReactElement,
  useCallback,
  useEffect,
  useRef,
} from 'react';

import {
  FLOATING_INITIAL_STYLE,
  useFloatingPosition,
} from './use-floating-position';

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
  const setSuggestionUi = useSetAtom($suggestionUi);
  const commandRef = useRef<HTMLDivElement>(null);
  const prevSelectedIndexRef = useRef<number>(0);
  const { pmEditorService } = useCoreServices();
  const editorView = pmEditorService.getEditor(editorName);
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

  useEffect(() => {
    if (!editorView || !active) {
      return;
    }

    setSuggestionUi((existing) => {
      const next = new Map(existing);
      next.set(editorView, {
        ...(next.get(editorView) ?? {}),
        slash_command: {
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
        },
      });
      return next;
    });

    return () => {
      setSuggestionUi((existing) => {
        const next = new Map(existing);
        const handlers = { ...(next.get(editorView) ?? {}) };
        delete handlers.slash_command;
        if (Object.keys(handlers).length) {
          next.set(editorView, handlers);
        } else {
          next.delete(editorView);
        }
        return next;
      });
    };
  }, [active, editorView, setSuggestionUi]);

  const slashRef = useFloatingPosition({
    show: Boolean(active?.show),
    anchorEl: () => active?.anchorEl() ?? null,
    boundarySelector: '.ProseMirror:not([contenteditable="false"])',
  });

  const ext = pmEditorService.extensions;

  const dismissCommandUi = useCallback(() => {
    if (!editorView || !active) {
      return;
    }

    ext.suggestions.command.replaceSuggestMarkWith({
      content: '',
    })(editorView.state, editorView.dispatch, editorView);
  }, [editorView, active, ext]);

  if (!editorView || !active?.show) {
    return null;
  }

  return (
    <div ref={slashRef} style={FLOATING_INITIAL_STYLE}>
      <Command
        ref={commandRef}
        className="overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md"
      >
        <CommandInput
          hidden
          value={active.text.slice(1)}
          onValueChange={() => {}}
        />
        <CommandEmpty>
          <span className="text-muted-foreground">Nothing found</span>
        </CommandEmpty>
        <CommandList>
          <CommandGroup heading="Basic">
            <CommandItem
              value="paragraph"
              onSelect={() => {
                dismissCommandUi();
                ext.paragraph.command.convertToParagraph(
                  editorView.state,
                  editorView.dispatch,
                  editorView,
                );
              }}
            >
              Paragraph
            </CommandItem>
            <CommandItem
              value="heading-1"
              onSelect={() => {
                dismissCommandUi();
                ext.heading.command.toggleHeading(1)(
                  editorView.state,
                  editorView.dispatch,
                  editorView,
                );
              }}
            >
              Heading 1
            </CommandItem>
            <CommandItem
              value="heading-2"
              onSelect={() => {
                dismissCommandUi();
                ext.heading.command.toggleHeading(2)(
                  editorView.state,
                  editorView.dispatch,
                  editorView,
                );
              }}
            >
              Heading 2
            </CommandItem>
            <CommandItem
              value="heading-3"
              onSelect={() => {
                dismissCommandUi();
                ext.heading.command.toggleHeading(3)(
                  editorView.state,
                  editorView.dispatch,
                  editorView,
                );
              }}
            >
              Heading 3
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Lists">
            <CommandItem
              value="bullet-list"
              onSelect={() => {
                dismissCommandUi();
                ext.list.command.toggleBulletList(
                  editorView.state,
                  editorView.dispatch,
                  editorView,
                );
              }}
            >
              Bullet list
            </CommandItem>
            <CommandItem
              value="numbered-list"
              onSelect={() => {
                dismissCommandUi();
                ext.list.command.toggleOrderedList(
                  editorView.state,
                  editorView.dispatch,
                  editorView,
                );
              }}
            >
              Numbered list
            </CommandItem>
            <CommandItem
              value="todo-list"
              onSelect={() => {
                dismissCommandUi();
                ext.list.command.toggleTaskList(
                  editorView.state,
                  editorView.dispatch,
                  editorView,
                );
              }}
            >
              To-do list
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Table">
            <CommandItem
              value="table-insert"
              onSelect={() => {
                dismissCommandUi();
                ext.table.command.insertTable(1, 1)(
                  editorView.state,
                  editorView.dispatch,
                  editorView,
                );
              }}
            >
              Insert table
            </CommandItem>
            {ext.table.query.isTableActive(editorView.state) && (
              <>
                <CommandItem
                  value="table-add-row"
                  onSelect={() => {
                    dismissCommandUi();
                    ext.table.command.addRowAfter(
                      editorView.state,
                      editorView.dispatch,
                      editorView,
                    );
                  }}
                >
                  + Row below
                </CommandItem>
                <CommandItem
                  value="table-add-column"
                  onSelect={() => {
                    dismissCommandUi();
                    ext.table.command.addColumnAfter(
                      editorView.state,
                      editorView.dispatch,
                      editorView,
                    );
                  }}
                >
                  + Column right
                </CommandItem>
                <CommandItem
                  value="table-delete-row"
                  onSelect={() => {
                    dismissCommandUi();
                    ext.table.command.deleteRow(
                      editorView.state,
                      editorView.dispatch,
                      editorView,
                    );
                  }}
                >
                  - Row
                </CommandItem>
                <CommandItem
                  value="table-delete-column"
                  onSelect={() => {
                    dismissCommandUi();
                    ext.table.command.deleteColumn(
                      editorView.state,
                      editorView.dispatch,
                      editorView,
                    );
                  }}
                >
                  - Column
                </CommandItem>
              </>
            )}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Time">
            <CommandItem
              value="today"
              onSelect={() => {
                dismissCommandUi();
                const today = format(new Date(), 'PP');

                ext.base.command.insertText({ text: today })(
                  editorView.state,
                  editorView.dispatch,
                  editorView,
                );
              }}
            >
              Today
            </CommandItem>
            <CommandItem
              value="yesterday"
              onSelect={() => {
                dismissCommandUi();
                const yesterday = format(subDays(new Date(), 1), 'PP');
                ext.base.command.insertText({ text: yesterday })(
                  editorView.state,
                  editorView.dispatch,
                  editorView,
                );
              }}
            >
              Yesterday
            </CommandItem>
            <CommandItem
              value="next-week"
              onSelect={() => {
                dismissCommandUi();
                const nextWeek = format(
                  startOfWeek(addWeeks(new Date(), 1)),
                  'PPP',
                );
                ext.base.command.insertText({ text: nextWeek })(
                  editorView.state,
                  editorView.dispatch,
                  editorView,
                );
              }}
            >
              Next week
            </CommandItem>
            <CommandItem
              value="next-month"
              onSelect={() => {
                dismissCommandUi();
                const nextMonth = format(
                  startOfMonth(addMonths(new Date(), 1)),
                  'PP',
                );
                ext.base.command.insertText({ text: nextMonth })(
                  editorView.state,
                  editorView.dispatch,
                  editorView,
                );
              }}
            >
              Next month
            </CommandItem>
          </CommandGroup>
        </CommandList>
        <CommandHints hints={['Enter to select', 'Escape to dismiss']} />
      </Command>
    </div>
  );
}
