import {
  collection,
  type EditorView,
  Plugin,
  PluginKey,
} from '@bangle.io/prosemirror-plugins';

export type AssetLinkPluginConfig = {
  openAssetLink: (view: EditorView, href: string) => boolean;
};

export function setupAssetLinkPlugin(config: AssetLinkPluginConfig) {
  return collection({
    id: 'asset-link-plugin',
    plugin: {
      openAssetLink: () =>
        new Plugin({
          key: new PluginKey('asset-link-open'),
          props: {
            handleClick: (view, pos, event) => {
              if (event.button !== 0 || !view.editable) {
                return false;
              }

              const $pos = view.state.doc.resolve(pos);
              const link = $pos
                .marks()
                .find((mark) => mark.type.name === 'link');
              const href =
                typeof link?.attrs.href === 'string' ? link.attrs.href : '';
              if (!href) {
                return false;
              }

              if (config.openAssetLink(view, href)) {
                event.preventDefault();
                return true;
              }
              return false;
            },
          },
        }),
    },
  });
}
