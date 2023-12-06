import {
  Button,
  Content,
  Flex,
  Heading,
  IllustratedMessage,
} from '@adobe/react-spectrum';
import { useStore, useTrack } from '@nalanda/react';
import Unauthorized from '@spectrum-icons/illustrations/Unauthorized';
import React from 'react';

import { slicePage } from '@bangle.io/slice-page';
import { locationHelpers } from '@bangle.io/ws-path';

export function PageWorkspaceNativeFsAuth() {
  const store = useStore();
  const { wsName } = useTrack(slicePage);

  return (
    <IllustratedMessage>
      <Unauthorized />
      <Heading>Authorization needed</Heading>
      <Content>
        <Flex direction="column" gap="size-100">
          Bangle.io needs access to {'"'}
          {wsName}
          <Flex direction="row" gap="size-100">
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
              Go Back
            </Button>
            <Button
              autoFocus
              style="fill"
              variant="accent"
              onPress={() => {
                //
              }}
            >
              Grant Access
            </Button>
          </Flex>
        </Flex>
      </Content>
    </IllustratedMessage>
  );
}
