import { ActionGroup, Flex, Item, Text } from '@adobe/react-spectrum';
import React from 'react';

export function MainContentWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Flex
      direction="column"
      height="100%"
      gap="size-200"
      UNSAFE_className="overflow-y-auto B-app-main-content px-2 md:px-4 py-4"
    >
      {children}
    </Flex>
  );
}
