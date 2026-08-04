import { MarkdownSerializer } from '@bangle.dev/pm-markdown/pm';
import { Fragment, type Mark, type Node as PMNode } from 'prosemirror-model';

type MarkSerializers = MarkdownSerializer['marks'];

// Match the upstream serializer's ordering for mixable marks so we can detect
// a continuing mark that will be closed and reopened at this node boundary.
function reorderMixableMarks(
  marks: readonly Mark[],
  active: readonly Mark[],
  serializers: MarkSerializers,
): Mark[] {
  const ordered = [...marks];

  outer: for (let index = 0; index < ordered.length; index++) {
    const mark = ordered[index];
    if (!mark || !serializers[mark.type.name]?.mixable) break;

    for (let activeIndex = 0; activeIndex < active.length; activeIndex++) {
      const activeMark = active[activeIndex];
      if (!activeMark || !serializers[activeMark.type.name]?.mixable) break;
      if (!mark.eq(activeMark)) continue;

      if (index !== activeIndex) {
        ordered.splice(index, 1);
        ordered.splice(
          index > activeIndex ? activeIndex : activeIndex - 1,
          0,
          mark,
        );
      }
      continue outer;
    }
  }

  return ordered;
}

/**
 * Markdown delimiters cannot partially cross. When a continuing formatting
 * mark must close and reopen at leading whitespace, serialize that invisible
 * whitespace outside the mark so all visible formatting remains parseable.
 */
function normalizeBoundaryWhitespace(
  node: PMNode,
  serializers: MarkSerializers,
): PMNode {
  if (node.isLeaf) return node;

  const children: PMNode[] = [];
  let activeMarks: readonly Mark[] = [];

  node.forEach((child) => {
    const normalized = normalizeBoundaryWhitespace(child, serializers);
    const orderedMarks = reorderMixableMarks(
      normalized.marks,
      activeMarks,
      serializers,
    );
    const leadingWhitespace =
      normalized.isText && normalized.text
        ? /^\s+/.exec(normalized.text)?.[0]
        : undefined;

    let keep = 0;
    while (keep < Math.min(activeMarks.length, orderedMarks.length)) {
      const activeMark = activeMarks[keep];
      const orderedMark = orderedMarks[keep];
      if (!activeMark || !orderedMark || !activeMark.eq(orderedMark)) break;
      keep++;
    }

    const reopenedMarks = leadingWhitespace
      ? orderedMarks
          .slice(keep)
          .filter(
            (mark) =>
              mark.isInSet(activeMarks) &&
              serializers[mark.type.name]?.expelEnclosingWhitespace,
          )
      : [];

    if (leadingWhitespace && reopenedMarks.length > 0) {
      const whitespaceMarks = normalized.marks.filter(
        (mark) => !reopenedMarks.some((reopened) => reopened.eq(mark)),
      );
      children.push(
        normalized.cut(0, leadingWhitespace.length).mark(whitespaceMarks),
      );
      if (leadingWhitespace.length < normalized.nodeSize) {
        children.push(normalized.cut(leadingWhitespace.length));
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

    children.push(normalized);
    activeMarks = orderedMarks;
  });

  return node.copy(Fragment.fromArray(children));
}

class BoundarySafeMarkdownSerializer extends MarkdownSerializer {
  override serialize(content: PMNode, options: { tightLists?: boolean } = {}) {
    return super.serialize(
      normalizeBoundaryWhitespace(content, this.marks),
      options,
    );
  }
}

export function withBoundarySafeMarks(serializer: MarkdownSerializer) {
  return new BoundarySafeMarkdownSerializer(
    serializer.nodes,
    serializer.marks,
    serializer.options,
  );
}
