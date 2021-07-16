import './Changelog.css';
import React from 'react';
import { Modal } from 'ui-components';
import { useUIManagerContext } from 'ui-context';
import { BangleEditor, useEditorState } from '@bangle.dev/react';
import { SpecRegistry, corePlugins, coreSpec } from '@bangle.dev/core';
import * as markdown from '@bangle.dev/markdown';
import { config } from 'config';

const specRegistry = new SpecRegistry(coreSpec());

export function Changelog() {
  const { modal, dispatch } = useUIManagerContext();

  return modal === '@modal/changelog' ? (
    <Modal
      title="🎁 What's new?"
      onDismiss={() => {
        dispatch({
          type: 'UI/DISMISS_MODAL',
        });
      }}
    >
      <div
        className="overflow-y-scroll"
        style={{
          maxHeight: '60vh',
          minHeight: '60vh',
        }}
      >
        <ChangelogDisplay />
      </div>
    </Modal>
  ) : null;
}
const parser = markdown.markdownParser(specRegistry);
const serializer = markdown.markdownSerializer(specRegistry);

export function serializeMarkdown(editor) {
  return serializer.serialize(editor.view.state.doc);
}

function getMarkdown() {
  return config.changelogText || 'Error loading changelog';
}

function ChangelogDisplay() {
  const editorState = useEditorState({
    specRegistry,
    plugins: () => corePlugins(),
    initialValue: parser.parse(getMarkdown()),
  });

  return (
    <BangleEditor
      state={editorState}
      focusOnInit={false}
      className="changelog-container  px-5"
      renderNodeViews={() => {
        return null;
      }}
      id="abced"
      children={null}
    />
  );
}
