import rehypeParse from 'rehype-parse';
import rehypeRemark from 'rehype-remark';
import remarkHtml from 'remark-html';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import { unified } from 'unified';

export function markdownFromHTML(html: string): string {
  return unified()
    .use(rehypeParse)
    .use(rehypeRemark)
    .use(remarkStringify)
    .processSync(html)
    .toString();
}

export function htmlFromMarkdown(markdown: string): string {
  return unified()
    .use(remarkParse)
    .use(remarkHtml)
    .processSync(markdown)
    .toString();
}
