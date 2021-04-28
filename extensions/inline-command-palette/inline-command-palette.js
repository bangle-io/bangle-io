import React, { useMemo } from 'react';
import reactDOM from 'react-dom';
import { rafCommandExec } from '@bangle.dev/core/utils/js-utils';
import {
  useInlinePaletteItems,
  useInlinePaletteQuery,
  replaceSuggestionMarkWith,
} from 'inline-palette/index';
import { SidebarRow } from 'ui-components';
import { palettePluginKey } from './config';

const OneDayMilliseconds = 24 * 60 * 60 * 1000;
let getTimestamp = (type) => {
  switch (type) {
    case 'today-date': {
      const formatter = new Intl.DateTimeFormat('default', {
        dateStyle: 'medium',
        hour12: true,
      });
      return '' + formatter.format(new Date().getTime());
    }
    case 'today-date-time': {
      const formatter = new Intl.DateTimeFormat('default', {
        dateStyle: 'medium',
        timeStyle: 'medium',
        hour12: true,
      });
      return '' + formatter.format(new Date().getTime());
    }
    case 'today-time': {
      const formatter = new Intl.DateTimeFormat('default', {
        // dateStyle: 'medium',
        timeStyle: 'medium',
        hour12: true,
      });
      return '' + formatter.format(new Date().getTime());
    }
    case 'tomorrow-date': {
      const formatter = new Intl.DateTimeFormat('default', {
        dateStyle: 'medium',
        hour12: true,
      });
      return '' + formatter.format(new Date().getTime() + OneDayMilliseconds);
    }
    case 'yesterday-date': {
      const formatter = new Intl.DateTimeFormat('default', {
        dateStyle: 'medium',
        hour12: false,
      });
      return '' + formatter.format(new Date().getTime() - OneDayMilliseconds);
    }
    default: {
      throw new Error('Unknown timestamp type');
    }
  }
};

const insertDateCommand = (type) => {
  return (state, dispatch, view) => {
    rafCommandExec(view, (state, dispatch, view) => {
      dispatch?.(state.tr.replaceSelectionWith(state.schema.text(' ')));
    });
    return replaceSuggestionMarkWith(palettePluginKey, getTimestamp(type))(
      state,
      dispatch,
      view,
    );
  };
};

export function InlineCommandPalette() {
  const { query, counter } = useInlinePaletteQuery(palettePluginKey);

  const items = useMemo(() => {
    const items = [
      {
        uid: 'dateTodaysDate',
        title: "Date: Insert today's date",
        editorExecuteCommand: ({}) => {
          return insertDateCommand('today-date');
        },
      },
      {
        uid: 'dateTodaysDateAndTime',
        title: 'Date: Insert current date and time',
        editorExecuteCommand: ({}) => {
          return insertDateCommand('today-date-time');
        },
      },

      {
        uid: 'dateTodaysTime',
        title: 'Date: Insert current time',
        editorExecuteCommand: ({}) => {
          return insertDateCommand('today-time');
        },
      },

      {
        uid: 'dateTomorrowsDate',
        title: "Date: Insert tomorrow's date",
        editorExecuteCommand: ({}) => {
          return insertDateCommand('tomorrow-date');
        },
      },

      {
        uid: 'dateYesterdaysDate',
        title: "Date: Insert yesterday's date",
        editorExecuteCommand: ({}) => {
          return insertDateCommand('yesterday-date');
        },
      },
    ];

    return items.filter((item) => queryMatch(item, query));
  }, [query]);

  const { tooltipContentDOM, getItemProps } = useInlinePaletteItems(
    palettePluginKey,
    items,
    counter,
  );

  return reactDOM.createPortal(
    <div className="bangle-emoji-suggest">
      {items.map((item, i) => {
        return (
          <SidebarRow
            key={item.uid}
            dataId={item.uid}
            className="palette-row"
            title={item.title}
            rightHoverIcon={item.rightHoverIcon}
            rightIcon={
              <kbd className="whitespace-nowrap">{item.keybinding}</kbd>
            }
            {...getItemProps(item, i)}
          />
        );
      })}
    </div>,
    tooltipContentDOM,
  );
}

function queryMatch(command, query) {
  const keywords = command.keywords || '';

  if (keywords.length > 0) {
    if (strMatch(keywords.split(','), query)) {
      return command;
    }
  }
  return strMatch(command.title, query) ? command : undefined;
}

function strMatch(a, b) {
  b = b.toLocaleLowerCase();
  if (Array.isArray(a)) {
    return a.filter(Boolean).some((str) => strMatch(str, b));
  }

  a = a.toLocaleLowerCase();
  return a.includes(b) || b.includes(a);
}
