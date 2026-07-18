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
  CommandMenuRow,
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
import { useEditorCoreServices } from '../use-editor-core-services';
import { buildSlashMenuGroups, slashMenuFilter } from './slash-items';
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
    // Constrain to the owning editor: a global selector would pick the
    // first editable ProseMirror on the page and leak across editors.
    boundaryElement: editorView?.dom ?? null,
  });

  const ext = editorEngine.extensions;

  const dismissCommandUi = useCallback(() => {
    if (!editorView || !active) {
      return false;
    }

    return ext.suggestions.command.replaceSuggestMarkWith({
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
    if (!dismissCommandUi()) {
      return;
    }
    command(editorView.state, editorView.dispatch, editorView);
    if (refocus) {
      // Some inserts replace or move the focused block, dropping DOM focus;
      // restore it so typing continues in the new block.
      editorView.focus();
    }
  };

  const groups = buildSlashMenuGroups(ext, editorView.state, {
    run,
    insertText: (text) => run(ext.base.command.insertText({ text })),
    openDatePicker,
  });

  const labels = t.app.editor.slashCommand;

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: focus guard for a floating menu, not an interactive control.
    <div
      ref={slashRef}
      style={FLOATING_INITIAL_STYLE}
      onMouseDown={(event) => {
        // The editor must keep focus and its selection while the menu is
        // clicked — the menu is an extension of typing, like Notion's. Only
        // the list element itself is exempt so its scrollbar stays draggable.
        if (
          !(event.target instanceof HTMLElement) ||
          !event.target.hasAttribute('cmdk-list')
        ) {
          event.preventDefault();
        }
      }}
    >
      <Command
        ref={commandRef}
        filter={slashMenuFilter}
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
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <CommandItem
                      key={item.value}
                      value={item.value}
                      onSelect={item.onSelect}
                    >
                      <CommandMenuRow
                        icon={<Icon aria-hidden />}
                        title={item.title}
                        description={item.description}
                      />
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </React.Fragment>
          ))}
        </CommandList>
        <CommandHints hints={[labels.hintSelect, labels.hintDismiss]} />
      </Command>
    </div>
  );
}
