import { useCoreServices } from '@bangle.io/context';
import { $suggestions, $suggestionUi } from '@bangle.io/prosemirror-plugins';
import {
  Calendar,
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
  useState,
} from 'react';

import {
  FLOATING_INITIAL_STYLE,
  useFloatingPosition,
} from './use-floating-position';

type SlashCommandView = 'menu' | 'date-picker';

// Bound the calendar's month/year dropdowns to a generous window around the
// current year so far-off dates remain reachable without endless clicking.
const CALENDAR_YEAR_SPAN = 100;

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
  const [commandView, setCommandView] = useState<SlashCommandView>('menu');
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const { pmEditorService } = useCoreServices();
  const editorView = pmEditorService.getEditor(editorName);
  const ext = pmEditorService.extensions;
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

  const replaceSlashCommandWithText = useCallback(
    (text: string) => {
      if (!editorView || !active) {
        return;
      }

      ext.suggestions.command.replaceSuggestMarkWith({
        content: text,
      })(editorView.state, editorView.dispatch, editorView);
    },
    [editorView, active, ext],
  );

  const insertSelectedDate = useCallback(
    (date: Date) => {
      replaceSlashCommandWithText(format(date, 'PP'));
      // Selecting a day moves DOM focus into the calendar; return focus to the
      // editor so the caret lands right after the inserted date.
      editorView?.focus();
    },
    [replaceSlashCommandWithText, editorView],
  );

  useEffect(() => {
    if (!active?.show) {
      setCommandView('menu');
      setSelectedDate(new Date());
    }
  }, [active?.show]);

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
            if (commandView === 'date-picker') {
              insertSelectedDate(selectedDate);
              return;
            }

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
  }, [
    active,
    commandView,
    editorView,
    insertSelectedDate,
    selectedDate,
    setSuggestionUi,
  ]);

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

  const handleCommandKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      dismissCommandUi();
    },
    [dismissCommandUi],
  );

  if (!editorView || !active?.show) {
    return null;
  }

  if (commandView === 'date-picker') {
    const currentYear = new Date().getFullYear();

    return (
      // biome-ignore lint/a11y/noStaticElementInteractions: Escape handling for a floating popover, not an interactive control.
      <div
        ref={slashRef}
        style={FLOATING_INITIAL_STYLE}
        className="w-fit overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md"
        onKeyDown={handleCommandKeyDown}
      >
        <Calendar
          mode="single"
          captionLayout="dropdown"
          startMonth={new Date(currentYear - CALENDAR_YEAR_SPAN, 0)}
          endMonth={new Date(currentYear + CALENDAR_YEAR_SPAN, 11)}
          defaultMonth={selectedDate}
          selected={selectedDate}
          onSelect={(date) => {
            if (!date) {
              return;
            }
            setSelectedDate(date);
            insertSelectedDate(date);
          }}
        />
        <CommandHints hints={['Click a day to insert', 'Escape to dismiss']} />
      </div>
    );
  }

  return (
    <div ref={slashRef} style={FLOATING_INITIAL_STYLE}>
      <Command
        ref={commandRef}
        className="overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md"
        onKeyDown={handleCommandKeyDown}
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
            <CommandItem
              value="code-block code fenced-code snippet"
              onSelect={() => {
                dismissCommandUi();
                ext.codeBlock.command.toggleCodeBlock(
                  editorView.state,
                  editorView.dispatch,
                  editorView,
                );
              }}
            >
              Code block
            </CommandItem>
            <CommandItem
              value="table grid"
              onSelect={() => {
                dismissCommandUi();
                ext.table.command.insertTable()(
                  editorView.state,
                  editorView.dispatch,
                  editorView,
                );
                // Replacing the focused paragraph with the table drops DOM
                // focus; restore it so typing goes into the first cell.
                editorView.focus();
              }}
            >
              {t.app.editor.slashCommand.table}
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

          <CommandGroup heading="Time">
            <CommandItem
              value="date calendar"
              onSelect={() => {
                setCommandView('date-picker');
              }}
            >
              Date
            </CommandItem>
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
