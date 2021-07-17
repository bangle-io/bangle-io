import './Changelog.css';
import React, { useCallback, useEffect } from 'react';
import { Modal } from 'ui-components';
import { useUIManagerContext } from 'ui-context';
import { BangleEditor, useEditorState } from '@bangle.dev/react';
import { SpecRegistry, corePlugins, coreSpec } from '@bangle.dev/core';
import * as markdown from '@bangle.dev/markdown';
import { config } from 'config';
import { useLocalStorage } from 'utils';

const specRegistry = new SpecRegistry(coreSpec());

export function Changelog() {
  const { modal, dispatch } = useUIManagerContext();

  const showChangelog = modal === '@modal/changelog';

  useLastSeenChangelog(showChangelog);

  const onDismiss = useCallback(() => {
    dispatch({
      type: 'UI/DISMISS_MODAL',
    });
  }, [dispatch]);

  return showChangelog ? (
    <Modal title="🎁 What's new?" onDismiss={onDismiss}>
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

function getTopHeading(): string | undefined {
  const markdown = getMarkdown();
  const topHeading = markdown.split('\n').find((r) => r.startsWith('#'));

  return topHeading;
}

function useLastSeenChangelog(showChangelog: boolean) {
  const [lastSeenHeading, updateLastSeenHeading] = useLocalStorage(
    'app/changelog-last-seen1',
    '',
  );

  const { changelogHasUpdates, dispatch } = useUIManagerContext();
  // Update the last seen whenever a user sees a changelog
  useEffect(() => {
    const topHeading = getTopHeading();
    if (showChangelog && topHeading && lastSeenHeading !== topHeading) {
      updateLastSeenHeading(topHeading);
    }
  }, [showChangelog, updateLastSeenHeading, lastSeenHeading]);

  // sync the current state with the global ui store
  useEffect(() => {
    const hasUpdates = lastSeenHeading !== getTopHeading();
    if (hasUpdates !== changelogHasUpdates) {
      dispatch({
        type: 'UI/UPDATE_NEW_CHANGELOG',
        value: hasUpdates,
      });
    }
  }, [dispatch, changelogHasUpdates, lastSeenHeading]);
}
