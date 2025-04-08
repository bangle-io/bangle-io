// de.ts
import type { Translations } from '../types';

export const t = {
  meta: {
    lang: 'Deutsch',
    testCallback: ({ name }: { name: string }) => {
      return `Hallo ${name}`;
    },
  },
  app: {
    common: {
      bangleLogoAlt: 'Bangle Logo',
      newNote: 'Neue Notiz',
      newWorkspace: 'Neuer Arbeitsbereich',
      unknown: 'Unbekannt',
      home: 'Startseite',
      dismiss: 'Verwerfen',
      report: 'Melden',
      somethingWentWrong: 'Etwas ist schiefgelaufen',
      viewAll: 'Alle anzeigen',
      backButton: 'Zurück',
      nextButton: 'Weiter',
      createButton: 'Erstellen',
      clearButton: 'Löschen',
      closeButton: 'Schließen',
      cancelButton: 'Abbrechen',
      continueButton: 'Fortfahren',
      searchLabel: 'Suche',
      searchInputPlaceholder: 'Suchen...',
    },
    toolbar: {
      toggleMaxWidth: 'Maximale Breite umschalten',
    },
    sidebar: {
      newLabel: 'Neu',
      appActionsLabel: 'App-Aktionen',
      omniSearch: 'Omni-Suche',
      allCommands: 'Alle Befehle',
      changeTheme: 'Theme ändern',
      linksLabel: 'Links',
      homepage: 'Startseite',
      githubProject: 'GitHub-Projekt',
      reportIssue: 'Problem melden',
      twitter: 'Twitter',
      discord: 'Discord',
      footerTitle: 'Bangle.io',
      toggleSidebarSr: 'Seitenleiste umschalten',
      toggleSidebarRailTitle: 'Seitenleiste umschalten',
    },
    dialogs: {
      changeTheme: {
        placeholder: 'Wählen Sie eine Theme-Einstellung',
        badgeText: 'Theme ändern',
        groupHeading: 'Themes',
        emptyMessage: 'Keine Themes verfügbar',
        options: {
          system: 'System',
          light: 'Hell',
          dark: 'Dunkel',
        },
      },
      createNote: {
        placeholder: 'Geben Sie einen Notiznamen ein',
        badgeText: 'Notiz erstellen',
        optionTitle: 'Erstellen',
      },
      deleteNote: {
        placeholder: 'Wählen oder tippen Sie eine Notiz zum Löschen',
        badgeText: 'Notiz löschen',
        groupHeading: 'Notizen',
        emptyMessage: 'Keine Notizen gefunden',
        hintDelete: 'Enter drücken oder klicken zum Löschen',
      },
      confirmDelete: {
        title: 'Löschen bestätigen',
        description: ({ fileName }: { fileName: string }) =>
          `Sind Sie sicher, dass Sie "${fileName}" löschen möchten?`,
        continueText: 'Löschen',
      },
      renameNote: {
        placeholder: 'Geben Sie einen neuen Namen an',
        badgeText: ({
          fileNameWithoutExtension,
        }: {
          fileNameWithoutExtension: string;
        }) => `Umbenennen von "${fileNameWithoutExtension}"`,
        optionTitle: 'Namensänderung bestätigen',
      },
      moveNote: {
        placeholder: 'Wählen Sie einen Pfad zum Verschieben der Notiz',
        badgeText: ({
          fileNameWithoutExtension,
        }: {
          fileNameWithoutExtension: string;
        }) => `Verschieben von "${fileNameWithoutExtension}"`,
        emptyMessage: 'Keine Verzeichnisse gefunden',
        groupHeading: 'Verzeichnisse',
        hintClick: 'Enter drücken oder klicken',
        hintDrag:
          'Tipp: Versuchen Sie, eine Notiz in der Seitenleiste zu ziehen',
      },
      createDirectory: {
        placeholder: 'Verzeichnisnamen eingeben',
        badgeText: 'Verzeichnis erstellen',
        optionTitle: 'Erstellen',
      },
      switchWorkspace: {
        placeholder: 'Wählen Sie einen Arbeitsbereich zum Wechseln',
        badgeText: 'Arbeitsbereich wechseln',
        groupHeading: 'Arbeitsbereiche',
        emptyMessage: 'Keine Arbeitsbereiche gefunden',
      },
      deleteWorkspace: {
        placeholder: 'Wählen Sie einen Arbeitsbereich zum Löschen',
        badgeText: 'Arbeitsbereich löschen',
        groupHeading: 'Arbeitsbereiche',
        emptyMessage: 'Keine Arbeitsbereiche gefunden',
      },
      confirmDeleteWorkspace: {
        title: 'Löschen bestätigen',
        description: ({ wsName }: { wsName: string }) =>
          `Sind Sie sicher, dass Sie den Arbeitsbereich "${wsName}" löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.`,
        continueText: 'Löschen',
      },
      nativeFsAuth: {
        title: 'Berechtigung erteilen?',
        descriptionRetry: ({ wsName }: { wsName: string }) =>
          `Das hat nicht funktioniert. Bangle.io benötigt Ihre Berechtigung für den Zugriff auf "${wsName}"`,
        continueTextRetry: 'Erneut versuchen',
        descriptionInitial: ({ wsName }: { wsName: string }) =>
          `Bangle.io benötigt Ihre Berechtigung für den Zugriff auf "${wsName}"`,
        continueTextInitial: 'Erteilen',
      },
      createWorkspace: {
        invalidName: 'Ungültiger Arbeitsbereichsname',
        browserTitle: 'Browser',
        browserDescription: 'Arbeitsbereichsdaten im Browserspeicher speichern',
        nativeFsTitle: 'Natives Dateisystem',
        nativeFsDescription:
          'Arbeitsbereichsdaten im nativen Dateisystem speichern',
        errorTitle: 'Fehler',
        noStorageTypes: 'Keine Speicherarten verfügbar.',
        selectTypeTitle: 'Wählen Sie einen Arbeitsbereichstyp',
        dataPrivacyLink: 'Ihre Daten bleiben bei Ihnen',
        enterNameTitle: 'Arbeitsbereichsnamen eingeben',
        enterNameDescription:
          'Bitte geben Sie einen Namen für Ihren Arbeitsbereich ein.',
        nameLabel: 'Arbeitsbereichsname',
        invalidNameDefault: 'Ungültiger Arbeitsbereichsname',
        selectDirectoryTitle: 'Verzeichnis auswählen',
        selectDirectoryDescription:
          'Wählen Sie ein Verzeichnis zum Speichern Ihrer Notizen.',
        directoryPickingUnsupported:
          'Verzeichnisauswahl wird nicht unterstützt.',
        pickDirectoryButton: 'Verzeichnis auswählen',
        invalidDirectoryDefault: 'Ungültige Verzeichnisauswahl',
      },
      allFiles: {
        title: 'Alle Dateien',
        searchPlaceholder: 'Dateien suchen...',
        emptyMessage: 'Keine Dateien gefunden.',
      },
      singleSelect: {
        placeholderDefault: 'Wählen Sie eine Option...',
        emptyMessageDefault: 'Keine Elemente gefunden.',
      },
      singleInput: {
        placeholderDefault: 'Eingabe..',
      },
    },
    errors: {
      workspace: {
        notOpened: 'Kein Arbeitsbereich geöffnet',
        noNoteOpenCannotToggleWideEditor:
          'Keine Notiz geöffnet, Breitbild-Editor kann nicht umgeschaltet werden.',
        noNotesToDelete:
          'Keine Notizen zum Löschen vorhanden oder bereitgestellt',
        invalidMetadata: ({ wsName }: { wsName: string }) =>
          `Ungültige Arbeitsbereichsmetadaten für ${wsName}. Fehlendes Root-Verzeichnis-Handle`,
        noNoteOpenToClone: 'Keine Notiz zum Klonen geöffnet',
        noWorkspaceForDailyNote:
          'Kein Arbeitsbereich geöffnet, um eine tägliche Notiz zu erstellen.',
      },
      file: {
        invalidNotePath: 'Ungültiger Notizpfad angegeben',
        invalidNoteName: 'Ungültiger Notizname angegeben',
        cannotMoveDuringRename:
          'Datei kann während des Umbenennens nicht verschoben werden. Verwenden Sie den Verschiebebefehl.',
        cannotRenameToDifferentWorkspace:
          'Notiz kann nicht in einen anderen Arbeitsbereich umbenannt werden',
        alreadyExistsInDest:
          'Eine Notiz mit demselben Namen existiert bereits im Zielverzeichnis',
        originalNoteNotFound: 'Originalnotiz nicht gefunden',
      },
      wsPath: {
        invalidNotePath: 'Ungültiger Notizpfad',
        absolutePathNotAllowed: 'Absolute Pfade sind nicht erlaubt',
        directoryTraversalNotAllowed: 'Verzeichniswechsel ist nicht erlaubt',
        invalidCharsInPath: 'Ungültige Zeichen im Pfad',
        pathTooLong: 'Pfad überschreitet maximale Länge',
        invalidDirectoryPath: 'Ungültiger Verzeichnispfad',
      },
      nativeFs: {
        errorOpening: {
          title: 'Fehler beim Öffnen Ihres Notizordners.',
          message:
            'Bitte stellen Sie sicher, dass sich Ihr Notizordner an einem üblichen Ort wie Dokumente oder Desktop befindet.',
        },
        clickedTooSoon: {
          title: 'Das hat nicht funktioniert',
          message:
            'Bitte versuchen Sie erneut, auf die Schaltfläche "Durchsuchen" zu klicken.',
        },
        accessDenied: {
          title: 'Zugriff verweigert',
          message:
            'Bitte erlauben Sie den Zugriff auf Ihren Ordner, um fortzufahren.',
        },
        unknown: {
          title: 'Unbekannter Fehler aufgetreten',
          message:
            'Bitte versuchen Sie es erneut oder laden Sie die Seite neu.',
        },
      },
      workspaceValidation: {
        typeRequired: 'Arbeitsbereichstyp ist erforderlich',
        nameRequired: 'Arbeitsbereichsname ist erforderlich',
        dirRequired: 'Verzeichnisauswahl ist erforderlich',
      },
    },
    toasts: {
      permissionNotGranted: 'Berechtigung nicht erteilt',
    },
    pageWelcome: {
      newUser: 'Willkommen bei Bangle',
      regularUser: 'Willkommen zurück!',
      recentWorkspacesHeading: 'Zuletzt verwendete Arbeitsbereiche',
      createWorkspacePrompt:
        'Erstellen Sie einen Arbeitsbereich, um loszulegen.',
    },
    pageFatalError: {
      title: 'Schwerwiegender Fehler',
      description:
        'Etwas ist ernsthaft schiefgelaufen. Wir entschuldigen uns für die Unannehmlichkeiten.',
      reloadButton: 'App neu laden',
      reportButton: 'Problem melden',
    },
    pageNativeFsAuthFailed: {
      title: 'Authentifizierung fehlgeschlagen. Bitte versuchen Sie es erneut',
      tryAgainButton: 'Erneut versuchen',
    },
    pageNativeFsAuthReq: {
      title:
        'Authentifizierung erforderlich. Bitte erlauben Sie den Zugriff, um fortzufahren',
      authorizeButton: 'Autorisieren',
    },
    pageNotFound: {
      title: 'Seite nicht gefunden',
      goHomeButton: 'Zur Willkommensseite',
      reportButton: 'Problem melden',
    },
    pageWorkspaceNotFound: {
      title: 'Arbeitsbereich nicht gefunden',
      createWorkspaceButton: 'Arbeitsbereich erstellen',
      switchWorkspaceButton: 'Arbeitsbereich wechseln',
    },
    pageWsHome: {
      recentNotesHeading: 'Zuletzt verwendete Notizen',
      noNotesMessage: 'Keine Notizen in diesem Arbeitsbereich gefunden.',
      newNoteButton: 'Neue Notiz',
      switchWorkspaceButton: 'Arbeitsbereich wechseln',
    },
    pageWsPathNotFound: {
      // Using NoteNotFoundView strings
    },
    noteNotFoundView: {
      title: 'Notiz nicht gefunden',
      description: 'Die gesuchte Notiz existiert nicht oder wurde verschoben.',
      viewAllNotesButton: 'Alle Notizen anzeigen',
      goBackButton: 'Zurück',
      goHomeButton: 'Startseite',
    },
    workspaceNotFoundView: {
      title: 'Arbeitsbereich nicht gefunden',
      description: ({ wsName }: { wsName: string }) =>
        `Der Arbeitsbereich "${wsName}" existiert nicht oder wurde umbenannt.`,
      genericDescription:
        'Dieser Arbeitsbereich existiert nicht oder wurde umbenannt.',
      goHomeButton: 'Zur Willkommensseite',
      switchWorkspaceButton: 'Arbeitsbereich wechseln',
    },
    landingPage: 'Startseite',
    components: {
      appSidebar: {
        openedLabel: 'Geöffnet',
        filesLabel: 'Dateien',
        newFileActionTitle: 'Neue Datei',
        newFileActionSr: 'Datei erstellen',
        showMoreButton: 'Mehr anzeigen',
        workspacesLabel: 'Arbeitsbereiche',
        noWorkspaceSelectedTitle: 'Kein Arbeitsbereich ausgewählt',
        noWorkspaceSelectedSubtitle:
          'Klicken Sie, um einen Arbeitsbereich auszuwählen',
      },
      breadcrumb: {
        moreSr: 'Mehr',
      },
      tree: {
        renameAction: 'Umbenennen',
        deleteAction: 'Löschen',
        moveAction: 'Verschieben',
        createNoteAction: 'Notiz erstellen',
      },
      dialog: {
        closeSr: 'Schließen',
      },
      sheet: {
        closeSr: 'Schließen',
      },
    },
    funMessages: [
      'Ups! Sieht aus, als hätten wir in Albuquerque falsch abgebogen!',
      'Houston, wir haben ein Problem - etwas ist im Weltraum verloren gegangen! 🚀',
      'Spielt Verstecken (und gewinnt!) 🙈',
      'Ist in den Urlaub gefahren, ohne eine Nachsendeadresse zu hinterlassen 🏖',
      'Praktiziert soziale Distanzierung 😷',
      'Plot Twist: Das existiert nicht! 🎬',
      'Von Außerirdischen entführt 👽',
      'Verloren in der Matrix',
      'Erkundet gerade Paralleluniversen 🌌',
      'Hoppla! Jagt gerade Schmetterlinge 🦋',
      'Nimmt gerade an einem Yoga-Retreat teil 🧘‍♀️',
      'Nicht gefunden: Holt wahrscheinlich Kaffee ☕',
      'Baut gerade einen Schneemann ⛄',
      'Zuletzt gesehen auf dem Weg nach Narnia 🦁',
      'Sucht nach Erleuchtung 🕯',
      'Ist Angeln! 🎣',
      'Lernt gerade jonglieren 🤹‍♂️',
      'Hat sich dem Zirkus angeschlossen 🎪',
      'Besteigt gerade den Mount Everest 🏔',
      'Nicht hier: Übt Tanzschritte 💃',
      'Hat auf der Datenautobahn falsch abgebogen 🛣',
      'Ist gerade im Ninja-Trainingslager 🥷',
      'Pflanzt gerade Bäume 🌱',
      'Vermisst: Erkundet den Marianengraben 🌊',
      'Jagt Regenbögen 🌈',
      'Nimmt an den Olympischen Spielen teil 🏅',
      'Erfindet gerade die Zeitreise ⏰',
      'Weg: Schreibt Memoiren 📚',
      'Auf der Suche nach dem Heiligen Gral 🏆',
      'Studiert Quantenmechanik 🔬',
      'Zählt gerade Sterne ⭐',
      'Vermisst: Lernt Ukulele spielen 🎸',
      'Nimmt an einem Pizza-Wettessen teil 🍕',
      'Trainiert für einen Marathon 🏃‍♀️',
      'Löst gerade den Weltfrieden ✌️',
    ],
  },
} satisfies Translations;
