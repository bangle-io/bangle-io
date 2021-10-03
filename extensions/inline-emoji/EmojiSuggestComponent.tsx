import { emojiSuggestKey } from './config';
import type { EditorView } from '@bangle.dev/pm';
import { PluginKey } from '@bangle.dev/pm';
import { UniversalPalette } from 'ui-components';
import { useEditorViewContext, usePluginState } from '@bangle.dev/react';
import React, { useCallback, useEffect, useMemo } from 'react';
import reactDOM from 'react-dom';
import {
  GetEmojiGroupsType,
  getSuggestTooltipKey,
  selectEmoji,
} from '@bangle.dev/react-emoji-suggest/dist/emoji-suggest';
import {
  getSquareDimensions,
  resolveCounter,
} from '@bangle.dev/react-emoji-suggest/dist/utils';
import { suggestTooltip } from '@bangle.dev/tooltip';

export function EmojiSuggestComponent() {
  return <EmojiSuggest emojiSuggestKey={emojiSuggestKey} />;
}

// WARNING DONOT MODIFY AS THIS IS A COPY , instead try fixing the TODO before making changes
// to this component and its children
// TODO the code below has been copied from the package `@bangle.dev/react-emoji-suggest`
// we should avoid code duplication.
export function EmojiSuggest({
  emojiSuggestKey,
}: {
  emojiSuggestKey: PluginKey;
}) {
  const {
    counter,
    triggerText,
    show: isVisible,
  } = usePluginState(getSuggestTooltipKey(emojiSuggestKey));
  const view = useEditorViewContext();
  const {
    tooltipContentDOM,
    getEmojiGroups,
    maxItems,
    squareSide,
    squareMargin,
    rowWidth,
    palettePadding,
    selectedEmojiSquareId,
  } = usePluginState(emojiSuggestKey);

  return reactDOM.createPortal(
    <div className="bangle-io-emoji-suggest-container  shadow-2xl">
      <div className="bangle-emoji-suggest" style={{ padding: palettePadding }}>
        <div
          style={{
            width: rowWidth,
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          {isVisible && (
            <EmojiSuggestContainer
              view={view}
              rowWidth={rowWidth}
              squareMargin={squareMargin}
              squareSide={squareSide}
              maxItems={maxItems}
              emojiSuggestKey={emojiSuggestKey}
              getEmojiGroups={getEmojiGroups}
              triggerText={triggerText}
              counter={counter}
              selectedEmojiSquareId={selectedEmojiSquareId}
            />
          )}
        </div>
      </div>
      <UniversalPalette.PaletteInfo className="bangle-io-palette-info">
        <UniversalPalette.PaletteInfoItem>
          <kbd className="font-normal">←↑↓→</kbd> Navigate
        </UniversalPalette.PaletteInfoItem>
        <UniversalPalette.PaletteInfoItem>
          <kbd className="font-normal">Enter</kbd> Select Emoji
        </UniversalPalette.PaletteInfoItem>
        <UniversalPalette.PaletteInfoItem>
          <kbd className="font-normal">Esc</kbd> Dismiss
        </UniversalPalette.PaletteInfoItem>
      </UniversalPalette.PaletteInfo>
    </div>,
    tooltipContentDOM,
  );
}

// WARNING DONOT MODIFY AS THIS IS A COPY read the TODO above
export function EmojiSuggestContainer({
  view,
  rowWidth,
  squareMargin,
  squareSide,
  emojiSuggestKey,
  getEmojiGroups,
  triggerText,
  counter,
  selectedEmojiSquareId,
  maxItems,
}: {
  view: EditorView;
  rowWidth: number;
  squareMargin: number;
  squareSide: number;
  emojiSuggestKey: PluginKey;
  getEmojiGroups: GetEmojiGroupsType;
  triggerText: string;
  counter: number;
  selectedEmojiSquareId: string;
  maxItems: number;
}) {
  const emojiGroups = useMemo(
    () => getEmojiGroups(triggerText),
    [getEmojiGroups, triggerText],
  );
  const { containerWidth } = getSquareDimensions({
    rowWidth,
    squareMargin,
    squareSide,
  });

  const { item: activeItem } = resolveCounter(counter, emojiGroups);
  const onSelectEmoji = useCallback(
    (emojiAlias: string) => {
      selectEmoji(emojiSuggestKey, emojiAlias)(view.state, view.dispatch, view);
    },
    [view, emojiSuggestKey],
  );

  useEffect(() => {
    if (emojiGroups.every((grp) => grp.emojis.length === 0)) {
      suggestTooltip.removeSuggestMark(emojiSuggestKey)(
        view.state,
        view.dispatch,
        view,
      );
    }
  }, [emojiGroups, emojiSuggestKey, view]);

  return (
    <div
      className="bangle-emoji-suggest-container"
      style={{
        width: containerWidth,
      }}
    >
      {emojiGroups.map(({ name: groupName, emojis }, i) => {
        return (
          <div className="bangle-emoji-suggest-group" key={groupName || i}>
            {groupName && <span>{groupName}</span>}
            <div>
              {emojis.slice(0, maxItems).map(([emojiAlias, emoji], j) => (
                <EmojiSquare
                  key={emojiAlias}
                  isSelected={activeItem?.[0] === emojiAlias}
                  emoji={emoji}
                  emojiAlias={emojiAlias}
                  onSelectEmoji={onSelectEmoji}
                  selectedEmojiSquareId={selectedEmojiSquareId}
                  style={{
                    margin: squareMargin,
                    width: squareSide,
                    height: squareSide,
                    lineHeight: squareSide + 'px',
                    fontSize: Math.max(squareSide - 7, 4),
                  }}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// WARNING DONOT MODIFY AS THIS IS A COPY read the TODO above
function EmojiSquare({
  isSelected,
  emoji,
  emojiAlias,
  onSelectEmoji,
  style,
  selectedEmojiSquareId,
}: {
  isSelected: boolean;
  emoji: string;
  emojiAlias: string;
  onSelectEmoji: (alias: string) => void;
  style: any;
  selectedEmojiSquareId: string;
}) {
  return (
    <button
      className={`bangle-emoji-square ${
        isSelected ? 'bangle-is-selected' : ''
      }`}
      id={isSelected ? selectedEmojiSquareId : undefined}
      onClick={(e) => {
        e.preventDefault();
        onSelectEmoji(emojiAlias);
      }}
      style={style}
    >
      {emoji}
    </button>
  );
}
