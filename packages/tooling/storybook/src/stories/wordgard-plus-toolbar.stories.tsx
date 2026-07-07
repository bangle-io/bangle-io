/**
 * M4-P0 exit-criterion demo (plans/011): a React toolbar of resolved
 * first-party Wordgard menu items, updating live, on a plain Wordgard setup
 * with zero Bangle imports inside the demoed packages. The editor is created
 * by THIS story — wordgard-plus only contributes extensions and components,
 * proving the "complement, never wrap" posture.
 */

import {
  createEditorAtoms,
  createMenuAtoms,
  createTooltipHost,
  type ResolvedMenuNode,
  reactTooltip,
  TooltipHost,
  useResolvedMenu,
} from '@bangle.io/wordgard-plus';
import {
  basicSchema,
  bulletList,
  history,
  orderedList,
  Tooltip,
  Wordgard,
} from '@bangle.io/wordgard-utils';
import type { Meta, StoryObj } from '@storybook/react';
import { createStore } from 'jotai';
import { useAtomValue } from 'jotai/react';
import React, { useMemo, useRef, useState } from 'react';

function MenuNode({ node }: { node: ResolvedMenuNode }) {
  if (node.kind === 'separator') {
    return <span style={{ width: 1, background: '#ccc', margin: '0 4px' }} />;
  }
  if (node.kind === 'custom') {
    return null;
  }
  if (node.kind === 'submenu') {
    return (
      <span
        style={{
          display: 'inline-flex',
          gap: 2,
          border: '1px dashed #bbb',
          borderRadius: 6,
          padding: '0 4px',
          alignItems: 'center',
        }}
        title={node.description ?? undefined}
      >
        {node.label ? <small>{node.label}</small> : null}
        {node.items.map((child) => (
          <MenuNode key={child.key} node={child} />
        ))}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={node.run}
      disabled={!node.enabled}
      aria-pressed={node.active}
      aria-label={node.description ?? undefined}
      title={node.description ?? undefined}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 28,
        height: 28,
        borderRadius: 6,
        border: '1px solid #ccc',
        background: node.active ? '#c7d2fe' : 'white',
        opacity: node.enabled ? 1 : 0.4,
        cursor: node.enabled ? 'pointer' : 'default',
      }}
    >
      {node.icon ? (
        <svg viewBox="0 0 100 100" width={16} height={16} aria-hidden="true">
          <path d={node.icon} fill="currentColor" />
        </svg>
      ) : (
        <small>{node.label}</small>
      )}
    </button>
  );
}

function WordgardPlusDemo() {
  const store = useMemo(() => createStore(), []);
  const [setup] = useState(() => {
    const editorAtoms = createEditorAtoms({ store });
    const menuAtoms = createMenuAtoms({ store });
    const host = createTooltipHost(store);
    return { editorAtoms, menuAtoms, host };
  });
  const editorRef = useRef<Wordgard | null>(null);

  const parentRef = (node: HTMLDivElement | null) => {
    if (!node || editorRef.current) {
      return;
    }
    editorRef.current = Wordgard.create({
      parent: node,
      doc: '<h2>wordgard-plus demo</h2><p>Select some text, toggle marks from the React toolbar, make a list, undo…</p>',
      config: [
        Wordgard.label('wordgard-plus demo editor'),
        basicSchema(),
        bulletList(),
        orderedList(),
        history(),
        setup.editorAtoms.extension,
        setup.menuAtoms.extension,
        // Selection bubble demoing the React tooltip glue: Wordgard
        // positions it; React renders its content via <TooltipHost>.
        Tooltip.show.compute((state) =>
          state.selection.empty
            ? null
            : reactTooltip({
                host: setup.host,
                pos: state.selection.from,
                end: state.selection.to,
                above: true,
                arrow: true,
                content: () => (
                  <span
                    style={{
                      background: '#111',
                      color: 'white',
                      borderRadius: 4,
                      padding: '2px 6px',
                      fontSize: 12,
                    }}
                  >
                    {state.selection.to - state.selection.from} selected
                  </span>
                ),
              }),
        ),
      ],
    });
  };

  const menu = useResolvedMenu(setup.menuAtoms.atoms, store);
  const selection = useAtomValue(setup.editorAtoms.atoms.selection, {
    store,
  });
  const focused = useAtomValue(setup.editorAtoms.atoms.focused, { store });
  const canUndo = useAtomValue(setup.editorAtoms.atoms.canUndo, { store });
  const canRedo = useAtomValue(setup.editorAtoms.atoms.canRedo, { store });

  return (
    <div style={{ maxWidth: 640, fontFamily: 'sans-serif' }}>
      <div
        role="toolbar"
        aria-label="Editor toolbar"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 4,
          padding: 6,
          border: '1px solid #ddd',
          borderRadius: 8,
          marginBottom: 8,
        }}
      >
        {menu.map((node) => (
          <MenuNode key={node.key} node={node} />
        ))}
      </div>
      <div
        ref={parentRef}
        style={{
          border: '1px solid #ddd',
          borderRadius: 8,
          padding: 8,
          minHeight: 140,
        }}
      />
      <p style={{ fontSize: 12, color: '#555' }}>
        focused: {String(focused)} · selection {selection.from}–{selection.to}
        {selection.empty ? ' (cursor)' : ''} · canUndo: {String(canUndo)} ·
        canRedo: {String(canRedo)}
      </p>
      <TooltipHost handle={setup.host} />
    </div>
  );
}

const meta: Meta<typeof WordgardPlusDemo> = {
  title: 'wordgard-plus/Toolbar',
  component: WordgardPlusDemo,
};

export default meta;
type Story = StoryObj<typeof WordgardPlusDemo>;

export const Default: Story = {};
