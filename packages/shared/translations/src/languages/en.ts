/**
 * This is a very simple translation system.
 *
 * NO IMPORTS - as we serialize the translations and execute them in the browser.
 *
 * If using a callback, ensure you DONOT have any DEPENDENCIES / IMPORTS.
 */
export const t = {
  meta: {
    lang: 'English',
    testCallback: ({ name }: { name: string }) => {
      return `Hello ${name}`;
    },
  },

  app: {
    pageWelcome: {
      newUser: 'Welcome to Bangle',
      regularUser: 'Welcome back!',
      recentWorkspacesHeading: 'Recent workspaces',
      createWorkspacePrompt: 'Create a workspace to get started.',
    },
    pageFatalError: {
      title: 'Fatal Error',
      description:
        'Something went seriously wrong. We apologize for the inconvenience.',
      reloadButton: 'Reload App',
      reportButton: 'Report Issue',
    },
    pageNativeFsAuthFailed: {
      title: 'Authentication Failed Please try again',
      tryAgainButton: 'Try Again',
    },
    pageNativeFsAuthReq: {
      title: 'Authentication Required, Please allow access to continue',
      authorizeButton: 'Authorize',
    },
    pageNotFound: {
      title: 'Page Not Found',
      goHomeButton: 'Go to Welcome Screen',
      reportButton: 'Report Issue',
    },
    pageWorkspaceNotFound: {
      title: 'Workspace Not Found',
      createWorkspaceButton: 'Create Workspace',
      switchWorkspaceButton: 'Switch Workspace',
    },
    pageWsHome: {
      recentNotesHeading: 'Recent notes',
      noNotesMessage: 'No notes found in this workspace.',
      newNoteButton: 'New Note',
      switchWorkspaceButton: 'Switch Workspace',
    },
    pageWsPathNotFound: {
      // Using NoteNotFoundView strings
    },
    noteNotFoundView: {
      title: 'Note Not Found',
      description:
        "The note you're looking for doesn't exist or has been moved.",
      viewAllNotesButton: 'View All Notes',
      goBackButton: 'Go Back',
      goHomeButton: 'Go Home',
    },
    workspaceNotFoundView: {
      title: 'Workspace Not Found',
      description: ({ wsName }: { wsName: string }) =>
        `The workspace "${wsName}" doesn\'t exist or was renamed.`,
      genericDescription: "This workspace doesn't exist or was renamed.",
      goHomeButton: 'Go to Welcome Screen',
      switchWorkspaceButton: 'Switch Workspace',
    },
    landingPage: 'Landing page',
  },
};
