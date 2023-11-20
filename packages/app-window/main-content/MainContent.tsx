import {
  defaultTheme,
  Flex,
  Provider,
  ToggleButton,
  View,
} from '@adobe/react-spectrum';
import { useStore, useTrack } from '@nalanda/react';
import MarginRightIcon from '@spectrum-icons/workflow/MarginRight';
import React from 'react';

import { sliceUI } from '@bangle.io/slice-ui';

export function MainContent() {
  const { widescreen } = useTrack(sliceUI);
  const store = useStore();

  console.count('MainContent');
  return (
    <Flex direction="column" height="100%" UNSAFE_className="overflow-y-scroll">
      <div
        style={
          widescreen
            ? {
                // overflow: 'scroll',
              }
            : {}
        }
      >
        <View backgroundColor="celery-600" height="size-800" />
        <View backgroundColor="blue-600" height="size-800" />
        <View backgroundColor="magenta-600" height="size-800" />
        <View backgroundColor="magenta-600" height="size-800" />
        <View backgroundColor="magenta-600" height="size-800" />
        <View backgroundColor="magenta-600" height="size-800" />
        <View backgroundColor="magenta-600" height="size-800" />
        <View backgroundColor="celery-600" height="size-800" />
        <View backgroundColor="blue-600" height="size-800" />
        <View backgroundColor="magenta-600" height="size-800" />
        <View backgroundColor="magenta-600" height="size-800" />
        <View backgroundColor="magenta-600" height="size-800" />
        <View backgroundColor="magenta-600" height="size-800" />
        <View backgroundColor="magenta-600" height="size-800" />
        <View backgroundColor="celery-600" height="size-800" />
        <View backgroundColor="blue-600" height="size-800" />
        <View backgroundColor="magenta-600" height="size-800" />
        <View backgroundColor="magenta-600" height="size-800" />
        <View backgroundColor="magenta-600" height="size-800" />
        <View backgroundColor="magenta-600" height="size-800" />
        <View backgroundColor="magenta-600" height="size-800" />
        <View backgroundColor="celery-600" height="size-800" />
        <View backgroundColor="blue-600" height="size-800" />
        <View backgroundColor="magenta-600" height="size-800" />
        <View backgroundColor="magenta-600" height="size-800" />
        <View backgroundColor="magenta-600" height="size-800" />
        <View backgroundColor="magenta-600" height="size-800" />
        <View backgroundColor="magenta-600" height="size-800" />
        <View backgroundColor="celery-600" height="size-800" />
        <View backgroundColor="blue-600" height="size-800" />
        <View backgroundColor="magenta-600" height="size-800" />
        <View backgroundColor="magenta-600" height="size-800" />
        <View backgroundColor="magenta-600" height="size-800" />
        <View backgroundColor="magenta-600" height="size-800" />
        <View backgroundColor="magenta-600" height="size-800" />
        <View backgroundColor="celery-600" height="size-800" />
        <View backgroundColor="blue-600" height="size-800" />
        <View backgroundColor="magenta-600" height="size-800" />
        <View backgroundColor="magenta-600" height="size-800" />
        <View backgroundColor="magenta-600" height="size-800" />
        <View backgroundColor="magenta-600" height="size-800" />
        <View backgroundColor="magenta-600" height="size-800" />
        <View backgroundColor="celery-600" height="size-800" />
        <View backgroundColor="blue-600" height="size-800" />
        <View backgroundColor="magenta-600" height="size-800" />
        <View backgroundColor="magenta-600" height="size-800" />
        <View backgroundColor="magenta-600" height="size-800" />
        <View backgroundColor="magenta-600" height="size-800" />
        <View backgroundColor="magenta-600" height="size-800" />
        <View backgroundColor="celery-600" height="size-800" />
        <View backgroundColor="blue-600" height="size-800" />
        <View backgroundColor="magenta-600" height="size-800" />
        <View backgroundColor="magenta-600" height="size-800" />
        <View backgroundColor="magenta-600" height="size-800" />
        <View backgroundColor="magenta-600" height="size-800" />
        <View backgroundColor="magenta-600" height="size-800" />
      </div>
    </Flex>
  );
}
