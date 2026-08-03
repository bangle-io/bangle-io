import { MarkdownSerializer } from '@bangle.dev/pm-markdown/pm';
import { Fragment, type Mark, type Node as PMNode } from 'prosemirror-model';

type MarkSerializers = MarkdownSerializer['marks'];

function usesHighlightDelimiters(mark: Mark, serializers: MarkSerializers) {
  const serializer = serializers[mark.type.name];
  return serializer?.open === '==' && serializer.close === '==';
}

function reorderMixableMarks(
  marks: readonly Mark[],
  active: readonly Mark[],
  serializers: MarkSerializers,
): Mark[] {
  let ordered = [...marks];

  outer: for (let i = 0; i < ordered.length; i++) {
    const mark = ordered[i];
    if (!mark || !serializers[mark.type.name]?.mixable) {
      break;
    }
    for (let j = 0; j < active.length; j++) {
      const other = active[j];
      if (!other || !serializers[other.type.name]?.mixable) {
        break;
      }
      if (mark.eq(other)) {
        if (i > j) {
          ordered = ordered
            .slice(0, j)
            .concat(mark)
            .concat(ordered.slice(j, i))
            .concat(ordered.slice(i + 1));
        } else if (j > i) {
          ordered = ordered
            .slice(0, i)
            .concat(ordered.slice(i + 1, j))
            .concat(mark)
            .concat(ordered.slice(j));
        }
        continue outer;
      }
    }
  }

  return ordered;
}

/**
 * Markdown cannot represent whitespace inside a formatting mark when that
 * mark must close and reopen across a highlight boundary. Remove only that
 * invisible whitespace formatting from the serializer's projection so the
 * emitted delimiters remain parseable; the live editor document is unchanged.
 */
function normalizeCrossingHighlightWhitespace(
  node: PMNode,
  serializers: MarkSerializers,
): PMNode {
  if (node.isLeaf) {
    return node;
  }

  const children: PMNode[] = [];
  let activeMarks: readonly Mark[] = [];

  node.forEach((child) => {
    const normalizedChild = normalizeCrossingHighlightWhitespace(
      child,
      serializers,
    );
    const orderedMarks = reorderMixableMarks(
      normalizedChild.marks,
      activeMarks,
      serializers,
    );
    const leadingWhitespace =
      normalizedChild.isText && normalizedChild.text
        ? /^\s+/.exec(normalizedChild.text)?.[0]
        : undefined;

    if (leadingWhitespace && activeMarks.length > 0) {
      let keep = 0;
      const sharedLength = Math.min(activeMarks.length, orderedMarks.length);
      while (keep < sharedLength) {
        const orderedMark = orderedMarks[keep];
        const activeMark = activeMarks[keep];
        if (!orderedMark || !activeMark || !orderedMark.eq(activeMark)) {
          break;
        }
        keep++;
      }

      const reopenedWhitespaceMarks = orderedMarks
        .slice(keep)
        .filter(
          (mark) =>
            mark.isInSet(activeMarks) &&
            serializers[mark.type.name]?.expelEnclosingWhitespace,
        );
      const crossingInvolvesHighlight = activeMarks
        .slice(keep)
        .concat(orderedMarks.slice(keep))
        .some((mark) => usesHighlightDelimiters(mark, serializers));

      if (crossingInvolvesHighlight && reopenedWhitespaceMarks.length > 0) {
        const whitespaceMarks = normalizedChild.marks.filter(
          (mark) => !reopenedWhitespaceMarks.some((item) => item.eq(mark)),
        );
        children.push(
          normalizedChild
            .cut(0, leadingWhitespace.length)
            .mark(whitespaceMarks),
        );
        if (leadingWhitespace.length < normalizedChild.nodeSize) {
          children.push(normalizedChild.cut(leadingWhitespace.length));
          activeMarks = orderedMarks;
        } else {
          activeMarks = reorderMixableMarks(
            whitespaceMarks,
            activeMarks,
            serializers,
          );
        }
        return;
      }
    }

    children.push(normalizedChild);
    activeMarks = orderedMarks;
  });

  return node.copy(Fragment.fromArray(children));
}

class HighlightCrossingMarkdownSerializer extends MarkdownSerializer {
  override serialize(content: PMNode, options: { tightLists?: boolean } = {}) {
    return super.serialize(
      normalizeCrossingHighlightWhitespace(content, this.marks),
      options,
    );
  }
}

/** Adds the narrow highlight-overlap safeguard to an assembled serializer. */
export function createMarkdownSerializer(serializer: MarkdownSerializer) {
  return new HighlightCrossingMarkdownSerializer(
    serializer.nodes,
    serializer.marks,
    serializer.options,
  );
}
