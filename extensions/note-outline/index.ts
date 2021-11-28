import { Extension } from '@bangle.io/extension-registry';

import {
  WATCH_HEADINGS_PLUGIN_STATE_UPDATE_ACTION,
  watchHeadingsPluginKey,
} from './config';
import { NoteOutline } from './NoteOutline';
import { watchHeadingsPlugin } from './watch-headings-plugin';

const extensionName = 'note-outline';

const extension = Extension.create({
  name: extensionName,
  editor: {
    plugins: [watchHeadingsPlugin()],
    watchPluginStates: [
      {
        action: WATCH_HEADINGS_PLUGIN_STATE_UPDATE_ACTION,
        pluginKey: watchHeadingsPluginKey,
      },
    ],
  },

  application: {
    actions: [
      {
        name: WATCH_HEADINGS_PLUGIN_STATE_UPDATE_ACTION,
        title: 'headings plugin state has updated',
        hidden: true,
      },
    ],
    noteSidebarWidgets: [
      {
        name: 'note-sidebar-widget::outline',
        ReactComponent: NoteOutline,
        title: 'Outline',
      },
    ],
  },
});

export default extension;
