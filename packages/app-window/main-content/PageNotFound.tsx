import {
  Button,
  Content,
  Flex,
  Heading,
  IllustratedMessage,
} from '@adobe/react-spectrum';
import { useStore } from '@nalanda/react';
import NotFound from '@spectrum-icons/illustrations/NotFound';
import React from 'react';

import { slicePage } from '@bangle.io/slice-page';
import { locationHelpers } from '@bangle.io/ws-path';

export function PageNotFound() {
  const store = useStore();
  return (
    <IllustratedMessage>
      <NotFound />
      <Heading>Not Found</Heading>
      <Content>
        <Flex direction="column" gap="size-100">
          The page was not found.
          <Button
            style="fill"
            variant="secondary"
            onPress={() => {
              store.dispatch(
                slicePage.actions.goTo((location) =>
                  locationHelpers.goToWorkspaceSelection(location),
                ),
              );
            }}
          >
            Go back
          </Button>
        </Flex>
      </Content>
    </IllustratedMessage>
  );
}
