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
    common: {
      bangleLogoAlt: 'Bangle logo',
      newNote: 'New Note',
      newWorkspace: 'New Workspace',
      unknown: 'Unknown',
      home: 'Home',
      dismiss: 'Dismiss',
      report: 'Report',
      somethingWentWrong: 'Something went wrong',
      viewAll: 'View all',
      backButton: 'Back',
      nextButton: 'Next',
      createButton: 'Create',
      clearButton: 'Clear',
      closeButton: 'Close',
      cancelButton: 'Cancel',
      continueButton: 'Continue',
      searchLabel: 'Search',
      searchInputPlaceholder: 'Search...',
    },
    toolbar: {
      toggleMaxWidth: 'Toggle Max Width',
    },
    sidebar: {
      newLabel: 'New',
      appActionsLabel: 'App Actions',
      omniSearch: 'Omni Search',
      allCommands: 'All Commands',
      changeTheme: 'Change Theme',
      linksLabel: 'Links',
      homepage: 'Homepage',
      githubProject: 'GitHub Project',
      reportIssue: 'Report an Issue',
      twitter: 'Twitter',
      discord: 'Discord',
      footerTitle: 'Bangle.io',
      toggleSidebarSr: 'Toggle Sidebar',
      toggleSidebarRailTitle: 'Toggle Sidebar',
    },
    dialogs: {
      changeTheme: {
        placeholder: 'Select a theme preference',
        badgeText: 'Change Theme',
        groupHeading: 'Themes',
        emptyMessage: 'No themes available',
        options: {
          system: 'System',
          light: 'Light',
          dark: 'Dark',
        },
      },
      createNote: {
        placeholder: 'Input a note name',
        badgeText: 'Create Note',
        optionTitle: 'Create',
      },
      deleteNote: {
        placeholder: 'Select or type a note to delete',
        badgeText: 'Delete Note',
        groupHeading: 'Notes',
        emptyMessage: 'No notes found',
        hintDelete: 'Press Enter or Click to delete',
      },
      confirmDelete: {
        title: 'Confirm Delete',
        description: ({ fileName }: { fileName: string }) =>
          `Are you sure you want to delete "${fileName}"?`,
        continueText: 'Delete',
      },
      renameNote: {
        placeholder: 'Provide a new name',
        badgeText: ({
          fileNameWithoutExtension,
        }: {
          fileNameWithoutExtension: string;
        }) => `Renaming "${fileNameWithoutExtension}"`,
        optionTitle: 'Confirm name change',
      },
      moveNote: {
        placeholder: 'Select a path to move the note',
        badgeText: ({
          fileNameWithoutExtension,
        }: {
          fileNameWithoutExtension: string;
        }) => `Move "${fileNameWithoutExtension}"`,
        emptyMessage: 'No directories found',
        groupHeading: 'Directories',
        hintClick: 'Press Enter or Click',
        hintDrag: 'Tip: Try dragging a note in the sidebar',
      },
      createDirectory: {
        placeholder: 'Input directory name',
        badgeText: 'Create Directory',
        optionTitle: 'Create',
      },
      switchWorkspace: {
        placeholder: 'Select a workspace to switch',
        badgeText: 'Switch Workspace',
        groupHeading: 'Workspaces',
        emptyMessage: 'No workspaces found',
      },
      deleteWorkspace: {
        placeholder: 'Select a workspace to delete',
        badgeText: 'Delete Workspace',
        groupHeading: 'Workspaces',
        emptyMessage: 'No workspaces found',
      },
      confirmDeleteWorkspace: {
        title: 'Confirm Delete',
        description: ({ wsName }: { wsName: string }) =>
          `Are you sure you want to delete the workspace "${wsName}"? This action cannot be undone.`,
        continueText: 'Delete',
      },
      nativeFsAuth: {
        title: 'Grant permission?',
        descriptionRetry: ({ wsName }: { wsName: string }) =>
          `That didn't work. Bangle.io needs your permission to access "${wsName}"`,
        continueTextRetry: 'Try Again',
        descriptionInitial: ({ wsName }: { wsName: string }) =>
          `Bangle.io needs your permission to access "${wsName}"`,
        continueTextInitial: 'Grant',
      },
      createWorkspace: {
        invalidName: 'Invalid workspace name',
        browserTitle: 'Browser',
        browserDescription: 'Save workspace data in browser storage',
        nativeFsTitle: 'Native File System',
        nativeFsDescription: 'Save workspace data in native file system',
        errorTitle: 'Error',
        noStorageTypes: 'No storage types are available.',
        selectTypeTitle: 'Select a workspace type',
        dataPrivacyLink: 'Your data stays with you',
        enterNameTitle: 'Enter Workspace Name',
        enterNameDescription: 'Please enter a name for your workspace.',
        nameLabel: 'Workspace Name',
        invalidNameDefault: 'Invalid workspace name',
        selectDirectoryTitle: 'Select Directory',
        selectDirectoryDescription: 'Choose a directory to store your notes.',
        directoryPickingUnsupported: 'Directory picking is not supported.',
        pickDirectoryButton: 'Pick Directory',
        invalidDirectoryDefault: 'Invalid directory selection',
      },
      allFiles: {
        title: 'All Files',
        searchPlaceholder: 'Search files...',
        emptyMessage: 'No files found.',
      },
      singleSelect: {
        placeholderDefault: 'Select an option...',
        emptyMessageDefault: 'No items found.',
      },
      singleInput: {
        placeholderDefault: 'Input..',
      },
    },
    errors: {
      workspace: {
        notOpened: 'No workspace open',
        noNoteOpenCannotToggleWideEditor:
          'No note is currently open, cannot toggle wide editor.',
        noNotesToDelete: 'No notes provided or available to delete',
        invalidMetadata: ({ wsName }: { wsName: string }) =>
          `Invalid workspace metadata for ${wsName}. Missing root dir handle`,
        noNoteOpenToClone: 'No note open to clone',
        noWorkspaceForDailyNote: 'No workspace is open to create a daily note.',
      },
      file: {
        invalidNotePath: 'Invalid note path provided',
        invalidNoteName: 'Invalid note name provided',
        cannotMoveDuringRename:
          'Cannot move file during rename operation. Use move command.',
        cannotRenameToDifferentWorkspace:
          'Cannot rename note to a different workspace',
        alreadyExistsInDest:
          'A note with the same name already exists in the destination directory',
        originalNoteNotFound: 'Original note not found',
      },
      wsPath: {
        invalidNotePath: 'Invalid note path',
        absolutePathNotAllowed: 'Absolute paths are not allowed',
        directoryTraversalNotAllowed: 'Directory traversal is not allowed',
        invalidCharsInPath: 'Invalid characters in path',
        pathTooLong: 'Path exceeds maximum length',
        invalidDirectoryPath: 'Invalid directory path',
      },
      nativeFs: {
        errorOpening: {
          title: 'There was an error opening your notes folder.',
          message:
            'Please make sure your notes folder is inside a common location like Documents or Desktop.',
        },
        clickedTooSoon: {
          title: "That didn't work",
          message: 'Please try clicking the Browse button again.',
        },
        accessDenied: {
          title: 'Access was denied',
          message: 'Please allow access to your folder to continue.',
        },
        unknown: {
          title: 'Unknown error occurred',
          message: 'Please try again or reload the page.',
        },
      },
      workspaceValidation: {
        typeRequired: 'Workspace type is required',
        nameRequired: 'Workspace name is required',
        dirRequired: 'Directory selection is required',
      },
    },
    toasts: {
      permissionNotGranted: 'Permission not granted',
    },
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
    components: {
      appSidebar: {
        openedLabel: 'Opened',
        filesLabel: 'Files',
        newFileActionTitle: 'New File',
        newFileActionSr: 'Create File',
        showMoreButton: 'Show More',
        workspacesLabel: 'Workspaces',
        noWorkspaceSelectedTitle: 'No workspace selected',
        noWorkspaceSelectedSubtitle: 'Click to select a workspace',
      },
      breadcrumb: {
        moreSr: 'More',
      },
      tree: {
        renameAction: 'Rename',
        deleteAction: 'Delete',
        moveAction: 'Move',
        createNoteAction: 'Create Note',
      },
      dialog: {
        closeSr: 'Close',
      },
      sheet: {
        closeSr: 'Close',
      },
    },
    funMessages: [
      'Oops! Looks like we took a wrong turn at Albuquerque!',
      'Houston, we have a problem - something got lost in space! 🚀',
      'Playing hide and seek (and winning!) 🙈',
      'Gone on vacation without leaving a forwarding address 🏖',
      'Practicing social distancing 😷',
      "Plot twist: This doesn't exist! 🎬",
      'Abducted by aliens 👽',
      'Lost in the Matrix',
      'Currently exploring parallel universes 🌌',
      'Whoopsie! Out chasing butterflies 🦋',
      'Currently attending a yoga retreat 🧘‍♀️',
      'Not found: Probably getting coffee ☕',
      'Busy building a snowman ⛄',
      'Last seen heading to Narnia 🦁',
      'Off seeking enlightenment 🕯',
      'Gone fishing! 🎣',
      'Busy learning to juggle 🤹‍♂️',
      'Joined the circus 🎪',
      'Currently climbing Mount Everest 🏔',
      'Not here: Practicing dance moves 💃',
      'Took a wrong turn at the information superhighway 🛣',
      'Currently at ninja training camp 🥷',
      'Busy planting trees 🌱',
      'Missing: Exploring the Mariana Trench 🌊',
      'Off chasing rainbows 🌈',
      'Competing in the Olympics 🏅',
      'Busy inventing time travel ⏰',
      'Away: Writing a memoir 📚',
      'On a quest for the holy grail 🏆',
      'Studying quantum mechanics 🔬',
      'Busy counting stars ⭐',
      'Missing: Learning to play the ukulele 🎸',
      'Participating in a pizza eating contest 🍕',
      'Training for a marathon 🏃‍♀️',
      'Currently solving world peace ✌️',
    ],
  },
};
