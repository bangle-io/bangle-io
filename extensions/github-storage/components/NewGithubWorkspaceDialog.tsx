import React, { useCallback, useEffect, useState } from 'react';

import { Dialog, ExternalLink, GithubIcon } from '@bangle.io/ui-components';

import {} from '../operations';

export function NewGithubWorkspaceDialog() {
  return (
    <Dialog
      isDismissable
      size="large"
      headingTitle="Github workspace"
      onDismiss={() => {}}
      headingIcon={<GithubIcon className="w-8 h-8" />}
      footer={
        <ExternalLink
          text="How to create a personal access Github token?"
          href="https://docs.github.com/en/enterprise-server@3.4/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token"
        ></ExternalLink>
      }
    >
      Creating a Github workspace will sync your notes to your choice of Github
      repository.
    </Dialog>
  );
}
