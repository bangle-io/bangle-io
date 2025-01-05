import { dropCursor } from './pm';
import { gapCursor } from './pm';

import { collection } from './common';

export interface DropCursorOptions {
  /**
   The color of the cursor. Defaults to `black`. Use `null` to apply no color and rely only on class.
   */
  color?: string | null;
  /**
   The precise width of the cursor in pixels. Defaults to 1.
   */
  width?: number;
  /**
   A CSS class name to add to the cursor element.
   */
  class?: string;
}

type RequiredDropCursorOptions = Required<DropCursorOptions>;

const DEFAULT_DROP_CURSOR_OPTIONS: RequiredDropCursorOptions = {
  color: 'black',
  width: 1,
  class: '',
};

export type DropGapCursorConfig = {
  dropCursorOptions?: DropCursorOptions;
};

type RequiredConfig = Required<DropGapCursorConfig>;

const DEFAULT_CONFIG: RequiredConfig = {
  dropCursorOptions: DEFAULT_DROP_CURSOR_OPTIONS,
};

// combining pm drop cursor and gap cursor
export function setupDropGapCursor(userConfig?: DropGapCursorConfig) {
  const config = {
    ...DEFAULT_CONFIG,
    ...userConfig,
  };

  const plugin = {
    dropCursor: pluginDropCursor(config),
    gapCursor: pluginGapCursor(),
  };

  return collection({
    id: 'drop-gap-cursor',
    plugin,
  });
}

// PLUGINS
function pluginDropCursor(config: RequiredConfig) {
  return () => {
    const { color, width, class: className } = config.dropCursorOptions;
    return dropCursor({
      color: !color ? undefined : color,
      width,
      class: className ? className : undefined,
    });
  };
}

function pluginGapCursor() {
  return () => {
    return gapCursor();
  };
}
