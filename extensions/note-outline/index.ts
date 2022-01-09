import { Extension } from '@bangle.io/extension-registry';

import {
  WATCH_HEADINGS_PLUGIN_STATE_UPDATE_OP,
  watchHeadingsPluginKey,
} from './config';
import { NoteOutline } from './NoteOutline';
import { watchHeadingsPlugin } from './watch-headings-plugin';

const extensionName = '@bangle.io/note-outline';

const extension = Extension.create({
  name: extensionName,
  editor: {
    plugins: [watchHeadingsPlugin()],
    watchPluginStates: [
      {
        operation: WATCH_HEADINGS_PLUGIN_STATE_UPDATE_OP,
        pluginKey: watchHeadingsPluginKey,
      },
    ],
  },
  application: {
    operations: [
      {
        name: WATCH_HEADINGS_PLUGIN_STATE_UPDATE_OP,
        title: 'headings plugin state has updated',
        hidden: true,
      },
    ],
    noteSidebarWidgets: [
      {
        name: `note-sidebar-widget::${extensionName}`,
        ReactComponent: NoteOutline,
        title: 'Outline',
      },
    ],
  },
});

export default extension;
