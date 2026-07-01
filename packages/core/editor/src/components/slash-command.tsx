import { useCoreServices } from '@bangle.io/context';
import { $suggestions, $suggestionUi } from '@bangle.io/prosemirror-plugins';
import {
  Button,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandHints,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  cn,
} from '@bangle.io/ui-components';
import {
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subDays,
} from 'date-fns';
import { useAtomValue, useSetAtom } from 'jotai';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getCalendarDays(month: Date): Date[] {
  return eachDayOfInterval({
    start: startOfWeek(startOfMonth(month)),
    end: endOfWeek(endOfMonth(month)),
  });
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
  const setSuggestionUi = useSetAtom($suggestionUi);
  const commandRef = useRef<HTMLDivElement>(null);
  const prevSelectedIndexRef = useRef<number>(0);
  const [commandView, setCommandView] = useState<SlashCommandView>('menu');
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [calendarMonth, setCalendarMonth] = useState(() =>
    startOfMonth(new Date()),
  );
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
    },
    [replaceSlashCommandWithText],
  );

  useEffect(() => {
    if (!active?.show) {
      setCommandView('menu');
      const today = new Date();
      setSelectedDate(today);
      setCalendarMonth(startOfMonth(today));
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

  if (!editorView || !active?.show) {
    return null;
  }

  if (commandView === 'date-picker') {
    return (
      <div ref={slashRef} style={FLOATING_INITIAL_STYLE}>
        <Command
          ref={commandRef}
          className="min-w-72 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md"
        >
          <CommandInput
            hidden
            value={active.text.slice(1)}
            onValueChange={() => {}}
          />
          <DateCommandCalendar
            month={calendarMonth}
            selectedDate={selectedDate}
            onMonthChange={setCalendarMonth}
            onSelectDate={(date) => {
              setSelectedDate(date);
              insertSelectedDate(date);
            }}
          />
          <CommandHints
            hints={['Click a day to insert', 'Escape to dismiss']}
          />
        </Command>
      </div>
    );
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

function DateCommandCalendar({
  month,
  selectedDate,
  onMonthChange,
  onSelectDate,
}: {
  month: Date;
  selectedDate: Date;
  onMonthChange: (month: Date) => void;
  onSelectDate: (date: Date) => void;
}): ReactElement {
  const days = getCalendarDays(month);
  const today = new Date();

  return (
    <div className="p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          aria-label="Previous month"
          onClick={() => {
            onMonthChange(startOfMonth(addMonths(month, -1)));
          }}
        >
          <ChevronLeft aria-hidden="true" />
        </Button>
        <div
          className="min-w-32 text-center font-medium text-sm"
          aria-live="polite"
        >
          {format(month, 'MMMM yyyy')}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          aria-label="Next month"
          onClick={() => {
            onMonthChange(startOfMonth(addMonths(month, 1)));
          }}
        >
          <ChevronRight aria-hidden="true" />
        </Button>
      </div>
      <section className="grid grid-cols-7 gap-1" aria-label="Calendar">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="flex size-8 items-center justify-center text-muted-foreground text-xs"
          >
            {label.slice(0, 2)}
          </div>
        ))}
        {days.map((day) => {
          const inCurrentMonth = isSameMonth(day, month);
          const selected = isSameDay(day, selectedDate);

          return (
            <Button
              key={day.toISOString()}
              type="button"
              variant={selected ? 'secondary' : 'ghost'}
              size="icon"
              className={cn(
                'size-8 rounded-md font-normal text-sm',
                !inCurrentMonth && 'text-muted-foreground opacity-50',
                isSameDay(day, today) &&
                  !selected &&
                  'border border-primary text-primary',
              )}
              aria-current={isSameDay(day, today) ? 'date' : undefined}
              aria-label={`Select ${format(day, 'PP')}`}
              onClick={() => onSelectDate(day)}
            >
              {format(day, 'd')}
            </Button>
          );
        })}
      </section>
    </div>
  );
}
