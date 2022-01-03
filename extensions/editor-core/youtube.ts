import { BaseRawNodeSpec } from '@bangle.dev/core';
import { inlineNodeParser } from '@bangle.dev/markdown';

import { pathMatcher } from '@bangle.io/ws-path';

export function youtubeMarkdownItPlugin(md) {
  return inlineNodeParser(md, {
    tokenName: 'youtube',
    regex:
      /^((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube\.com|youtu.be))(\/(?:[\w\-]+\?v=|embed\/|v\/)?)([\w\-]+)(\S+)?$/g,
    getTokenDetails: (match) => {
      return { payload: match, markup: '' };
    },
  });
}

const name = 'youtube';
export function youtubeSchema(): BaseRawNodeSpec {
  return {
    type: 'node',
    name,
    markdown: {
      toMarkdown(state, node) {
        state.text(
          `https://www.youtube.com/watch?v=${node.attrs.videoId}`,
          false,
        );
      },
      parseMarkdown: {
        youtube: {
          node: name,
          getAttrs: (tok) => {
            let payload = tok.payload;
            // see for examples https://regexr.com/3dj5t
            if (!payload.startsWith('http')) {
              payload = `https://${payload}`;
            }

            let url = new URL(payload);
            let videoId =
              url.searchParams.get('v') || url.searchParams.get('vi');

            if (videoId == null || videoId.length === 0) {
              if (payload.includes(`//youtu.be/`)) {
                let [result, match] = pathMatcher('/:videoId', url.pathname);
                if (result) {
                  videoId = match.videoId;
                }
              }
              if (payload.includes(`/embed/`)) {
                let [result, match] = pathMatcher(
                  '/embed/:videoId',
                  url.pathname,
                );
                if (result) {
                  videoId = match.videoId;
                }
              }
            }

            return {
              videoId: videoId || '',
            };
          },
        },
      },
    },
    schema: {
      atom: true,
      attrs: {
        videoId: {
          default: 'unknown',
        },
      },
      defining: true,
      draggable: false,
      group: 'inline',
      inline: true,
      isolating: true,
      selectable: true,
      toDOM: (node) => {
        const embedUrl = `https://www.youtube.com/embed/${node.attrs.videoId}`;
        return [
          'div',
          {
            'style': 'display: inline-block;',
            'class': 'rounded border-2 border-black',
            'data-bangle-attrs': JSON.stringify(node.attrs),
            'data-bangle-name': 'youtube',
          },
          [
            'iframe',
            {
              allow: 'autoplay; fullscreen',
              frameborder: '0',
              gesture: 'media',
              loading: 'lazy',
              src: embedUrl,
            },
          ],
        ];
      },
      parseDOM: [
        {
          tag: `div[data-bangle-name="${name}"]`,
          getAttrs: (dom: any) => {
            const attrs = dom.getAttribute('data-bangle-attrs');
            if (!attrs) {
              return {};
            }
            return JSON.parse(attrs);
          },
        },
      ],
    },
  };
}
