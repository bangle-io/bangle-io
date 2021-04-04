import PropTypes from 'prop-types';
import React, { useCallback, useEffect, useState } from 'react';

import { getIdleCallback } from '@bangle.dev/core/utils/js-utils';
import { BangleEditor, useEditorState } from '@bangle.dev/react';
import stopwatch from '@bangle.dev/react-stopwatch';
import sticker from '@bangle.dev/react-sticker';
import { EmojiSuggest } from '@bangle.dev/react-emoji-suggest';
import {
  FloatingMenu,
  Menu,
  MenuGroup,
  BoldButton,
  ItalicButton,
  CodeButton,
  FloatingLinkButton,
  HeadingButton,
  BulletListButton,
  LinkSubMenu,
  OrderedListButton,
  TodoListButton,
} from '@bangle.dev/react-menu';
import { config } from 'config/index';
import {
  specRegistry,
  getPlugins,
  menuKey,
  emojiSuggestKey,
} from 'editor/index';

const LOG = false;
let log = LOG ? console.log.bind(console, 'play/Editor') : () => {};

export const Editor = React.memo(function Editor({
  isFirst,
  wsPath,
  paletteType,
  sendRequest,
}) {
  const [editor, setEditor] = useState();

  useEffect(() => {
    // whenever paletteType goes undefined focus back on editor
    if (editor && !editor.view.hasFocus() && paletteType == null) {
      editor.view.focus();
    }
  }, [editor, paletteType]);

  const plugins = useCallback(() => {
    return getPlugins({ sendRequest, wsPath });
  }, [sendRequest, wsPath]);

  const onEditorReady = useCallback(
    (editor) => {
      if (isFirst) {
        window.editor = editor;
        setEditor(editor);
        if (!config.isIntegration) {
          getIdleCallback(() => {
            // import(
            //   /* webpackChunkName: "prosemirror-dev-tools" */ 'prosemirror-dev-tools'
            // ).then((args) => {
            //   args.applyDevTools(editor.view);
            // });
          });
        }
      }
    },
    [isFirst],
  );

  const renderNodeViews = useCallback(
    ({ node, updateAttrs, children, selected }) => {
      if (node.type.name === 'sticker') {
        return (
          <sticker.Sticker
            node={node}
            updateAttrs={updateAttrs}
            selected={selected}
          />
        );
      }

      if (node.type.name === 'stopwatch') {
        return <stopwatch.Stopwatch node={node} updateAttrs={updateAttrs} />;
      }
    },
    [],
  );

  const editorState = useEditorState({
    plugins: plugins,
    specRegistry,
  });

  useEffect(() => log('mounting editor', wsPath), [wsPath]);

  const renderMenuType = useCallback(({ type, menuKey }) => {
    if (type === 'defaultMenu') {
      return (
        <Menu>
          <MenuGroup>
            <BoldButton />
            <ItalicButton />
            <CodeButton />
            <FloatingLinkButton menuKey={menuKey} />
          </MenuGroup>
          <MenuGroup>
            <HeadingButton level={2} />
            <HeadingButton level={3} />
            <BulletListButton />
            <TodoListButton />
            <OrderedListButton />
          </MenuGroup>
        </Menu>
      );
    }
    if (type === 'linkSubMenu') {
      return (
        <Menu>
          <LinkSubMenu />
        </Menu>
      );
    }
    return null;
  }, []);

  return (
    <BangleEditor
      state={editorState}
      onReady={onEditorReady}
      renderNodeViews={renderNodeViews}
    >
      <FloatingMenu menuKey={menuKey} renderMenuType={renderMenuType} />
      <EmojiSuggest emojiSuggestKey={emojiSuggestKey} />
    </BangleEditor>
  );
});

// TODO This is causing bugs
// const cache = new Map();
// function usePersistSelection(wsPath, isFirst, editor) {
//   useEffect(() => {
//     const key = 'editorLastHead/' + wsPath;
//     const { selectionHead } = cache.get(key) || {};

//     if (editor && wsPath && isFirst && selectionHead > 0) {
//       // delay it a bit
//       // TODO we need a better event handler
//       // from the editor to only trigger this after document
//       // has settled.
//       setTimeout(() => {
//         requestAnimationFrame(() => {
//           cache.delete(key);
//           const { state, dispatch } = editor.view;
//           const SelectionAtStart =
//             state.selection.from === Selection.atStart(state.doc);

//           // log(
//           //   'dispatching selection moved',
//           //   wsPath,
//           //   selectionHead,
//           //   state.doc.content.size,
//           //   SelectionAtStart,
//           //   selectionHead < state.doc.content.size &&
//           //     selectionHead > 0 &&
//           //     !SelectionAtStart,
//           // );
//           if (
//             selectionHead < state.doc.content.size &&
//             selectionHead > 0 &&
//             !SelectionAtStart
//           ) {
//             let { tr } = state;
//             log('dispatching location', selectionHead);
//             tr = tr
//               .setSelection(Selection.near(tr.doc.resolve(selectionHead)))
//               .scrollIntoView();
//             dispatch(tr);
//           }
//         });
//       }, 10);
//     }
//     return () => {
//       if (editor?.view && isFirst && wsPath) {
//         const selectionHead = editor.view.state.selection.head;
//         log('saving position', key, selectionHead);
//         cache.set(key, {
//           selectionHead,
//         });
//       }
//     };
//   }, [wsPath, isFirst, editor]);
// }

Editor.propTypes = {
  isFirst: PropTypes.bool.isRequired,
  wsPath: PropTypes.string.isRequired,
  paletteType: PropTypes.string,
  sendRequest: PropTypes.func.isRequired,
};
