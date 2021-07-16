import markdownIt from 'markdown-it';

import { tableMarkdownItPlugin } from '@bangle.dev/markdown/table-markdown-it-plugin';
import { todoListMarkdownItPlugin } from '@bangle.dev/markdown/todo-list-markdown-it-plugin';

export const defaultMarkdownItTokenizer = markdownIt()
  .use(todoListMarkdownItPlugin)
  .use(tableMarkdownItPlugin);
