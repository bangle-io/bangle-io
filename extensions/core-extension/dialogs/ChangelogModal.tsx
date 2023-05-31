import React, { useCallback, useEffect } from 'react';

import {
  blockquote,
  bold,
  bulletList,
  code,
  codeBlock,
  doc,
  hardBreak,
  heading,
  horizontalRule,
  image,
  italic,
  link,
  listItem,
  orderedList,
  paragraph,
  strike,
  text,
  underline,
} from '@bangle.dev/base-components';
import type { BangleEditor as CoreBangleEditor } from '@bangle.dev/core';
import { Plugin, SpecRegistry } from '@bangle.dev/core';
import { markdownParser, markdownSerializer } from '@bangle.dev/markdown';
import { BangleEditor, useEditorState } from '@bangle.dev/react';

import { nsmApi2 } from '@bangle.io/api';
import { CHANGELOG_TEXT } from '@bangle.io/config';
import { CHANGELOG_MODAL_NAME } from '@bangle.io/constants';
import { Dialog } from '@bangle.io/ui-components';
import { useLocalStorage } from '@bangle.io/utils';

const specRegistry = new SpecRegistry([
  blockquote.spec(),
  bold.spec(),
  bulletList.spec(),
  code.spec(),
  codeBlock.spec(),
  doc.spec(),
  hardBreak.spec(),
  heading.spec(),
  horizontalRule.spec(),
  image.spec(),
  italic.spec(),
  link.spec(),
  listItem.spec(),
  orderedList.spec(),
  paragraph.spec(),
  strike.spec(),
  text.spec(),
  underline.spec(),
]);

export function ChangelogModal() {
  useLastSeenChangelog(true);

  const onDismiss = useCallback(() => {
    nsmApi2.ui.dismissDialog(CHANGELOG_MODAL_NAME);
  }, []);

  return (
    <Dialog
      heroImageUrl="https://user-images.githubusercontent.com/6966254/161450081-27ee5c2e-cd45-4091-be1d-7c6790a8b9fd.png"
      isDismissable
      headingTitle="What's new?"
      onDismiss={onDismiss}
      size="lg"
    >
      <div
        className="overflow-y-scroll"
        style={{
          maxHeight: 'min(50vh, 500px)',
          minHeight: 'min(50vh, 500px)',
        }}
      >
        <ChangelogDisplay />
      </div>
    </Dialog>
  );
}
const parser = markdownParser(specRegistry);
const serializer = markdownSerializer(specRegistry);

export function serializeMarkdown(editor: CoreBangleEditor) {
  return serializer.serialize(editor.view.state.doc);
}

function getMarkdown() {
  return CHANGELOG_TEXT || 'Error loading changelog';
}

function ChangelogDisplay() {
  const editorState = useEditorState({
    specRegistry,
    plugins: () => [
      new Plugin({
        props: {
          editable: () => false,
        },
      }),
    ],
    initialValue: parser.parse(getMarkdown()) || '',
  });

  return (
    <BangleEditor
      state={editorState}
      focusOnInit={false}
      className="px-5 B-core-extension_changelog-dialog-container text-sm"
      renderNodeViews={() => {
        return null;
      }}
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

  const { changelogHasUpdates } = nsmApi2.ui.uiState();
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
      nsmApi2.ui.updateChangelogHasUpdates({ hasUpdates: true });
    }
  }, [changelogHasUpdates, lastSeenHeading]);
}
