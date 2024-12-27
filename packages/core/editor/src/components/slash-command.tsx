import { suggestions } from '@bangle.io/prosemirror-plugins';
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
import { useAtomValue, useSetAtom } from 'jotai';
import React, { useEffect, useRef, type ReactElement } from 'react';
import { useFloatingPosition } from './use-floating-position';

/**
 * SlashCommand displays a floating "slash" menu when the user is inside
 * the suggestion mark that triggers the slash command.
 */
export function SlashCommand(): ReactElement | null {
  const suggestion = useAtomValue(suggestions.$suggestion);
  const markName = suggestion?.markName;
  const setSuggestionUi = useSetAtom(suggestions.$suggestionUi);
  const commandRef = useRef<HTMLDivElement>(null);
  const prevSelectedIndexRef = useRef<number>(0);

  const commands = [
    {
      group: 'Basic',
      items: [
        { id: 'create-new', label: 'Create new' },
        { id: 'paragraph', label: 'Paragraph' },
        { id: 'heading-1', label: 'Heading 1' },
        { id: 'heading-2', label: 'Heading 2' },
        { id: 'heading-3', label: 'Heading 3' },
      ],
    },
    {
      group: 'Lists',
      items: [
        { id: 'bullet-list', label: 'Bullet list' },
        { id: 'numbered-list', label: 'Numbered list' },
        { id: 'todo-list', label: 'To-do list' },
      ],
    },
  ];

  // Add effect to watch selectedIndex changes
  useEffect(() => {
    const selectedIndex = suggestion?.selectedIndex ?? 0;
    const prevIndex = prevSelectedIndexRef.current;

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
  }, [suggestion?.selectedIndex]);

  useEffect(() => {
    if (!markName) {
      return;
    }

    setSuggestionUi((existing) => ({
      ...existing,
      [markName]: {
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
    }));

    return () => {
      setSuggestionUi((existing) => {
        const cloned = { ...existing };
        delete cloned[markName];

        return cloned;
      });
    };
  }, [markName, setSuggestionUi]);

  const slashRef = useFloatingPosition({
    show: Boolean(suggestion?.show),
    anchorEl: () => suggestion?.anchorEl() ?? null,
    boundarySelector: '.ProseMirror:not([contenteditable="false"])',
  });

  if (!suggestion?.show) {
    return null;
  }

  return (
    <div
      ref={slashRef}
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        zIndex: 10,
      }}
      className="overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md"
    >
      <Command ref={commandRef}>
        <CommandInput
          hidden
          value={suggestion.text.slice(1)}
          onValueChange={() => {}}
        />
        <CommandEmpty>
          <span className="text-muted-foreground">Nothing found</span>
        </CommandEmpty>
        <CommandList>
          {commands.map((group, groupIndex) => {
            return (
              <React.Fragment key={group.group}>
                {groupIndex > 0 && <CommandSeparator />}
                <CommandGroup heading={group.group} className="text-foreground">
                  {group.items.map((command) => {
                    return (
                      <CommandItem
                        key={command.id}
                        value={command.id}
                        onSelect={() => {
                          console.log('Selected:', command.label);
                        }}
                      >
                        {command.label}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </React.Fragment>
            );
          })}
        </CommandList>
        <CommandHints hints={['Enter to select', 'Escape to dismiss']} />
      </Command>
    </div>
  );
}
