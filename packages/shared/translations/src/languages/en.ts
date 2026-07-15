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
      starItem: 'Star this item',
      unstarItem: 'Unstar this item',
    },
    toolbar: {
      toggleMaxWidth: 'Toggle Max Width',
    },
    editor: {
      fidelityNotice: {
        label: 'Markdown compatibility',
        title: 'Some Markdown cannot be fully preserved',
        description:
          'This note contains Markdown this editor cannot fully preserve. Opening it is safe and changes nothing, but if you edit and save, the parts it cannot represent are rewritten — some formatting or content may change or be removed.',
      },
      selectionMenu: {
        label: 'Text formatting',
        bold: 'Bold',
        italic: 'Italic',
        strike: 'Strikethrough',
        inlineCode: 'Inline code',
        link: 'Link',
      },
      linkEditor: {
        label: 'Edit link',
        inputLabel: 'Link URL',
        placeholder: 'example.com',
        copy: 'Copy link',
        copied: 'Copied!',
        copyFailed: 'Copy failed',
        open: 'Open link',
        remove: 'Remove link',
        invalidUrl: 'Enter a web address or Markdown path.',
      },
      codeBlock: {
        copy: 'Copy',
        copied: 'Copied',
        delete: 'Delete',
        deleteLabel: 'Delete code block',
        editLanguage: 'Edit language',
      },
      collapsibleHeading: {
        collapse: 'Collapse section',
        expand: 'Expand section',
      },
      frontmatter: {
        delete: 'Delete',
        deleteLabel: 'Delete frontmatter',
      },
      wikiLinkMenu: {
        label: 'Link to a note',
        empty: 'No notes found',
        linkTo: ({ query }: { query: string }) => `Link to “${query}”`,
      },
      wikiLink: {
        unresolvedLabel: ({ label }: { label: string }) =>
          `${label} (note not found)`,
      },
      linkedMentions: {
        heading: 'Linked mentions',
        loading: 'Loading linked mentions...',
        empty:
          'No backlinks yet. Type [[ in another note to create a backlink to this note.',
        error: 'Unable to load linked mentions',
        collapse: 'Collapse linked mentions',
        expand: 'Expand linked mentions',
      },
      placeholder: {
        emptyDoc: "Write something, or press '/' for commands…",
        emptyBlock: "Press '/' for commands",
      },
      blockHandle: {
        addBlock: 'Add block',
        addBelowHint: 'Click to add below',
        addAboveHint: ({ modifier }: { modifier: string }) =>
          `${modifier}-click to add above`,
        dragHandle: 'Drag to move',
      },
      slashCommand: {
        groupBasic: 'Basic blocks',
        groupLists: 'Lists',
        groupTime: 'Time',
        groupTable: 'Table',
        empty: 'No results',
        paragraph: 'Text',
        paragraphDesc: 'Plain paragraph text',
        heading1: 'Heading 1',
        heading1Desc: 'Large section heading',
        heading2: 'Heading 2',
        heading2Desc: 'Medium section heading',
        heading3: 'Heading 3',
        heading3Desc: 'Small section heading',
        codeBlock: 'Code block',
        codeBlockDesc: 'Fenced code with highlighting',
        table: 'Table',
        tableDesc: 'Insert a simple table',
        frontmatter: 'Frontmatter',
        frontmatterDesc: 'YAML properties at the top',
        bulletList: 'Bullet list',
        bulletListDesc: 'Simple bulleted list',
        numberedList: 'Numbered list',
        numberedListDesc: 'List with numbering',
        todoList: 'To-do list',
        todoListDesc: 'Track tasks with checkboxes',
        date: 'Date',
        dateDesc: 'Pick a date from the calendar',
        today: 'Today',
        todayDesc: "Insert today's date",
        yesterday: 'Yesterday',
        yesterdayDesc: "Insert yesterday's date",
        nextWeek: 'Next week',
        nextWeekDesc: "Insert next week's date",
        nextMonth: 'Next month',
        nextMonthDesc: "Insert next month's date",
        hintSelect: 'Enter to select',
        hintDismiss: 'Escape to dismiss',
      },
      datePicker: {
        hintSelect: 'Click a day to insert',
        hintDismiss: 'Escape to dismiss',
      },
      tableMenu: {
        label: 'Table options',
        addRowAbove: 'Add row above',
        addRowBelow: 'Add row below',
        addColumnLeft: 'Add column left',
        addColumnRight: 'Add column right',
        alignColumn: 'Align column',
        alignNone: 'None',
        alignLeft: 'Left',
        alignCenter: 'Center',
        alignRight: 'Right',
        deleteRow: 'Delete row',
        deleteColumn: 'Delete column',
        deleteTable: 'Delete table',
      },
    },
    editorW: {
      experimentalNotice:
        'Wordgard editor (experimental preview) — this note is read-only.',
      switchEditor: 'Switch editor',
      loadFailed: 'Unable to load this note.',
    },
    omniSearch: {
      dialogTitle: 'Omni command bar',
      inputPlaceholder: 'Type a command or search...',
      viewAllCommands: 'View All Commands',
      recentNotesHeading: 'Recent Notes',
      commandsHeading: '> Commands',
      allFilesHeading: 'All Files',
      filteredHeading: 'Filtered',
      noResults: 'No results found.',
    },
    sidebar: {
      newLabel: 'New',
      appActionsLabel: 'App Actions',
      omniSearch: 'Omni Search',
      allCommands: 'All Commands',
      settings: 'Settings',
      linksLabel: 'Links',
      homepage: 'Homepage',
      githubProject: 'GitHub Project',
      reportIssue: 'Report an Issue',
      twitter: 'Twitter',
      discord: 'Discord',
      footerTitle: 'Bangle.io',
      toggleSidebarSr: 'Toggle Sidebar',
      toggleSidebarRailTitle: 'Resize sidebar. Double-click to reset.',
    },
    settings: {
      title: 'Settings',
      backToApp: 'Back to app',
      general: {
        title: 'General',
        appSection: 'App',
        versionTitle: 'Version',
        versionDescription: 'The version and build identity of this app.',
        installPwaTitle: 'Install Bangle.io',
        installPwaDescription:
          'Add Bangle.io to this device and open it in its own app window.',
        installPwaButton: 'Install app',
        installingPwa: 'Installing...',
        appearanceSection: 'Appearance',
        themeTitle: 'Theme',
        themeDescription: 'Choose how Bangle looks on this device.',
        themeLabel: 'Theme preference',
        editorSection: 'Editor',
        assetLocationTitle: 'Asset location',
        assetLocationDescription:
          'Choose where pasted and dropped files are stored beside notes.',
        assetsFolder: 'Assets folder',
        adjacentToNote: 'Adjacent to note',
        wideEditorTitle: 'Editor width',
        wideEditorDescription:
          'Use the available window width for note editing.',
        wideEditorToggle: 'Use wide editor',
        defaultWidth: 'Default',
        wideWidth: 'Wide',
        enabled: 'Enabled',
        disabled: 'Disabled',
      },
      workspaces: {
        title: 'Workspaces',
        sectionTitle: 'Workspaces',
        newWorkspace: 'New workspace',
        emptyTitle: 'No workspaces',
        emptyDescription: 'Create a workspace to start writing notes.',
        noteCount: ({ count }: { count: number }) =>
          count === 1 ? '1 note' : `${count} notes`,
        noteCountLoading: 'Loading notes...',
        noteCountUnavailable: 'Notes unavailable',
        lastOpened: 'Last opened',
        neverOpened: 'Never opened',
        actionsLabel: ({ wsName }: { wsName: string }) =>
          `Workspace actions for ${wsName}`,
        openWorkspace: 'Open workspace',
        deleteWorkspace: 'Delete workspace',
      },
      nav: {
        general: 'General',
        workspaces: 'Workspaces',
      },
    },
    pageAsset: {
      downloadButton: 'Download',
      loading: 'Loading asset...',
      unavailable: 'Unable to load this asset.',
      noPreview:
        "This file can't be previewed here. Download it to view the contents.",
      videoUnsupported: "Your browser can't play this video format.",
      audioUnsupported: "Your browser can't play this audio format.",
    },
    dialogs: {
      changeTheme: {
        searchPlaceholder: 'Select a theme preference',
        title: 'Change Theme',
        groupLabel: 'Themes',
        emptyMessage: 'No themes available',
        options: {
          system: 'System',
          light: 'Light',
          dark: 'Dark',
        },
      },
      switchEditorEngine: {
        searchPlaceholder: 'Select an editor engine',
        title: 'Switch Editor Engine',
        description:
          'Choose which engine powers the editor. Switching reloads the app in place.',
        groupLabel: 'Editor engines',
        emptyMessage: 'No editor engines available',
        options: {
          prosemirror: 'ProseMirror (stable)',
          wordgard: 'Wordgard (experimental)',
        },
      },
      createNote: {
        title: 'Create Note',
        description: 'Name the note before adding it to this workspace.',
        inputLabel: 'Note name',
        placeholder: 'Untitled note',
        submitText: 'Create',
      },
      deleteNote: {
        placeholder: 'Select or type a note to delete',
        badgeText: 'Delete Note',
        groupHeading: 'Notes',
        emptyMessage: 'No notes found',
        hintDelete: 'Select a note to confirm deletion',
      },
      confirmDelete: {
        title: 'Confirm Delete',
        description: ({ fileName }: { fileName: string }) =>
          `Are you sure you want to delete "${fileName}"?`,
        continueText: 'Delete',
      },
      confirmDeleteFiles: {
        title: 'Confirm Delete',
        description: ({
          count,
          fileNames,
        }: {
          count: number;
          fileNames: string[];
        }) =>
          `Delete ${count} files? ${fileNames.slice(0, 5).join(', ')}${
            fileNames.length > 5 ? ', ...' : ''
          } will be removed.`,
        continueText: 'Delete Files',
      },
      renameNote: {
        title: 'Rename Note',
        description: ({
          fileNameWithoutExtension,
        }: {
          fileNameWithoutExtension: string;
        }) => `Choose a new name for "${fileNameWithoutExtension}".`,
        inputLabel: 'New name',
        placeholder: 'New note name',
        submitText: 'Rename',
      },
      renameFile: {
        title: 'Rename File',
        description: ({ fileName }: { fileName: string }) =>
          `Choose a new name for "${fileName}".`,
        inputLabel: 'New file name',
        placeholder: 'New file name',
        submitText: 'Rename',
      },
      moveNote: {
        searchPlaceholder: 'Select a path to move the note',
        title: ({
          fileNameWithoutExtension,
        }: {
          fileNameWithoutExtension: string;
        }) => `Move "${fileNameWithoutExtension}"`,
        emptyMessage: 'No folders to move this note into.',
        emptyActionText: 'Create Folder',
        groupLabel: 'Directories',
        hintClick: 'Press Enter or Click',
        hintDrag: 'Tip: Try dragging a note in the sidebar',
        hintCreateDirectory: 'Create a folder first, then move this note.',
      },
      createDirectory: {
        title: 'Create Folder',
        description: 'Add a folder to organize notes in this workspace.',
        inputLabel: 'Folder name',
        placeholder: 'Folder name',
        submitText: 'Create',
      },
      renameDirectory: {
        placeholder: 'Provide a new folder name',
        badgeText: ({ directoryName }: { directoryName: string }) =>
          `Rename "${directoryName}"`,
        optionTitle: 'Confirm folder rename',
      },
      confirmDeleteDirectory: {
        title: 'Confirm Delete',
        description: ({ directoryName }: { directoryName: string }) =>
          `Delete "${directoryName}" and every note inside it?`,
        continueText: 'Delete Folder',
      },
      switchWorkspace: {
        searchPlaceholder: 'Select a workspace to switch',
        title: 'Switch Workspace',
        groupLabel: 'Workspaces',
        emptyMessage: 'No workspaces found',
      },
      deleteWorkspace: {
        searchPlaceholder: 'Select a workspace to delete',
        title: 'Delete Workspace',
        groupLabel: 'Workspaces',
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
        selectTypeDescription: 'Choose where this workspace stores its notes.',
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
        createFailed: 'Could not create the workspace. Please try again.',
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
        noNoteOpened: 'No note is currently open.',
        reconnectNotFound: ({ wsName }: { wsName: string }) =>
          `The workspace "${wsName}" is no longer available.`,
        reconnectFailed:
          'Bangle could not reconnect that folder. Your workspace was not changed.',
        reconnectNameMismatch: ({
          expectedName,
          selectedName,
        }: {
          expectedName: string;
          selectedName: string;
        }) =>
          `Choose the folder named "${expectedName}", not "${selectedName}". Your workspace was not changed.`,
      },
      file: {
        invalidNotePath: 'Invalid note path provided',
        invalidNoteName: 'Invalid note name provided',
        cannotMoveDuringRename:
          'Cannot move file during rename operation. Use move command.',
        cannotRenameToDifferentWorkspace:
          'Cannot rename note to a different workspace',
        alreadyExistsInDest: ({ fileName }: { fileName: string }) =>
          `A note named "${fileName}" already exists in the destination folder`,
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
          message:
            'Please try again and choose your notes folder when prompted.',
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
      assetSaveInProgress: ({
        fileName,
        remainingCount,
      }: {
        fileName: string;
        remainingCount: number;
      }) =>
        remainingCount > 0
          ? `Saving ${fileName} + ${remainingCount} more...`
          : `Saving ${fileName}...`,
      assetSavePartial: ({
        failedCount,
        failedFileName,
        failedRemainingCount,
        savedFileName,
        savedRemainingCount,
      }: {
        failedCount: number;
        failedFileName: string;
        failedRemainingCount: number;
        savedFileName?: string;
        savedRemainingCount: number;
      }) => {
        const failedLabel =
          failedRemainingCount > 0
            ? `${failedFileName} + ${failedRemainingCount} more`
            : failedFileName;
        if (!savedFileName) {
          return `Could not save ${failedLabel}.`;
        }
        const savedLabel =
          savedRemainingCount > 0
            ? `${savedFileName} + ${savedRemainingCount} more`
            : savedFileName;
        return `${savedLabel} saved; ${failedCount} failed.`;
      },
      assetSaveSucceeded: ({
        fileName,
        remainingCount,
      }: {
        fileName: string;
        remainingCount: number;
      }) =>
        remainingCount > 0
          ? `Saved ${fileName} + ${remainingCount} more`
          : `Saved ${fileName}`,
      assetTooLarge: ({
        fileName,
        maxFileSize,
      }: {
        fileName: string;
        maxFileSize: string;
      }) => `${fileName} is too large. Maximum file size is ${maxFileSize}.`,
      fileCreated: ({ fileName }: { fileName: string }) =>
        `Created ${fileName}`,
      fileCreateFailed: 'Could not create file',
      fileDeleted: ({ fileName }: { fileName: string }) =>
        `Deleted ${fileName}`,
      fileDeleteFailed: 'Could not delete file',
      filesDeleted: ({ count }: { count: number }) =>
        count === 1 ? 'Deleted 1 file' : `Deleted ${count} files`,
      filesDeleteFailed: 'Could not delete files',
      fileMoved: ({ fileName }: { fileName: string }) => `Moved ${fileName}`,
      fileMoveFailed: 'Could not move file',
      fileRenamed: ({ fileName }: { fileName: string }) =>
        `Renamed to ${fileName}`,
      fileRenameFailed: 'Could not rename file',
      folderDeleted: ({ folderName }: { folderName: string }) =>
        `Deleted ${folderName}`,
      folderDeleteFailed: 'Could not delete folder',
      folderRenamed: ({ folderName }: { folderName: string }) =>
        `Renamed to ${folderName}`,
      folderRenameFailed: 'Could not rename folder',
      openAsset: 'Open',
      pathCopied: 'Path copied',
      pathCopyFailed: 'Could not copy path',
      selectionCopied: 'Copied as Markdown',
      selectionCopyFailed: 'Could not copy selection',
      selectionCopyEmpty: 'Select some text to copy',
      pasteMarkdownFailed: 'Could not paste Markdown',
      pasteMarkdownEmpty: 'Clipboard has no text to paste',
      permissionNotGranted: 'Permission not granted',
      retrySave: 'Retry save',
      saveFailed: 'Changes could not be saved. Retry to keep your latest edit.',
      editorEngineSwitchBlockedBySaves:
        'Cannot switch editors: a note has unsaved changes that could not be written. Retry the failed save first.',
      editorCommandUnavailable:
        'That editor command cannot run here. Place the cursor in a regular text block and try again.',
    },
    pageWelcome: {
      newUser: 'Welcome to Bangle',
      regularUser: 'Welcome back!',
      recentWorkspacesHeading: 'Recent workspaces',
      createWorkspacePrompt: 'Create a workspace to get started.',
    },
    pageStartupError: {
      title: 'Bangle could not start',
      description:
        'A required service failed during startup. Your notes were not changed.',
      detailsLabel: 'Startup error details',
      reloadButton: 'Reload App',
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
    pageNativeFsRecovery: {
      title: 'Reconnect your workspace folder',
      description: ({ wsName }: { wsName: string }) =>
        `Bangle can’t find the folder linked to “${wsName}”. It may have moved, been deleted, or be on a disconnected drive. Bangle has not changed your workspace entry or files. Locate the same folder to reconnect it.`,
      locateFolderButton: 'Locate Folder',
      switchWorkspaceButton: 'Switch Workspace',
    },
    noteNotFoundView: {
      title: 'Note Not Found',
      description:
        "The note you're looking for doesn't exist or has been moved.",
      viewAllNotesButton: 'View All Notes',
      goBackButton: 'Go Back',
      goHomeButton: 'Go Home',
    },
    fileNotFoundView: {
      title: 'File Not Found',
      description:
        "The file you're looking for doesn't exist or has been moved.",
      viewAllFilesButton: 'View All Files',
    },
    workspaceNotFoundView: {
      title: 'Workspace Not Found',
      description: ({ wsName }: { wsName: string }) =>
        `The workspace "${wsName}" doesn't exist or was renamed.`,
      genericDescription: "This workspace doesn't exist or was renamed.",
      goHomeButton: 'Go to Welcome Screen',
      switchWorkspaceButton: 'Switch Workspace',
    },
    landingPage: 'Landing page',
    components: {
      appSidebar: {
        openedLabel: 'Opened',
        starredLabel: 'Starred',
        filesLabel: 'Files',
        fileTreeLabel: 'Workspace files',
        noteCount: ({ count }: { count: number }) =>
          count === 1 ? '1 note' : `${count} notes`,
        newFileActionTitle: 'New File',
        newFileActionSr: 'Create File',
        newFolderActionTitle: 'New Folder',
        collapseAllFoldersActionTitle: 'Collapse All Folders',
        showNoteFilesOnlyActionTitle: 'Show Notes Only',
        newNoteHereActionTitle: 'New Note Here',
        newFolderHereActionTitle: 'New Folder Here',
        searchFilesActionLabel: 'Search Files',
        copyPathActionTitle: 'Copy path',
        openActionTitle: 'Open',
        renameActionTitle: 'Rename',
        moveActionTitle: 'Move',
        deleteActionTitle: 'Delete',
        deleteSelectedFilesActionTitle: ({ count }: { count: number }) =>
          `Delete ${count} files`,
        moveToWorkspaceRootLabel: 'Move to workspace root',
        workspacesLabel: 'Workspaces',
        manageLabel: 'Manage',
        manageWorkspaces: 'Manage Workspaces',
        noWorkspaceSelectedTitle: 'No workspace selected',
        noWorkspaceSelectedSubtitle: 'Click to select a workspace',
        mobileTitle: 'Sidebar',
        mobileDescription: 'Navigate workspaces, notes, and app actions.',
        fileTreeErrorMessage:
          'Could not refresh the file list. Showing the last known files.',
        fileTreeErrorRetry: 'Retry',
      },
      breadcrumb: {
        moreSr: 'More',
      },
      dialog: {
        closeSr: 'Close',
        commandDescriptionSr: 'Type to search and select an item.',
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
