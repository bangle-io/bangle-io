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
      starItem: 'Als Favorit markieren',
      unstarItem: 'Favorit entfernen',
    },
    toolbar: {
      toggleMaxWidth: 'Maximale Breite umschalten',
    },
    editor: {
      selectionMenu: {
        label: 'Textformatierung',
        bold: 'Fett',
        italic: 'Kursiv',
        strike: 'Durchgestrichen',
        inlineCode: 'Inline-Code',
        link: 'Link',
      },
      linkEditor: {
        label: 'Link bearbeiten',
        inputLabel: 'Link-URL',
        placeholder: 'beispiel.de',
        copy: 'Link kopieren',
        copied: 'Kopiert!',
        copyFailed: 'Kopieren fehlgeschlagen',
        open: 'Link öffnen',
        remove: 'Link entfernen',
        invalidUrl: 'Webadresse oder Markdown-Pfad eingeben.',
      },
      codeBlock: {
        copy: 'Kopieren',
        copied: 'Kopiert',
        editLanguage: 'Sprache bearbeiten',
      },
      wikiLinkMenu: {
        label: 'Mit einer Notiz verknüpfen',
        empty: 'Keine Notizen gefunden',
        linkTo: ({ query }: { query: string }) => `Mit „${query}“ verknüpfen`,
      },
      wikiLink: {
        unresolvedLabel: ({ label }: { label: string }) =>
          `${label} (Notiz nicht gefunden)`,
      },
      linkedMentions: {
        heading: 'Verlinkte Erwähnungen',
        loading: 'Verlinkte Erwähnungen werden geladen...',
        empty: 'Keine verlinkten Erwähnungen',
        error: 'Verlinkte Erwähnungen konnten nicht geladen werden',
        collapse: 'Verlinkte Erwähnungen einklappen',
        expand: 'Verlinkte Erwähnungen ausklappen',
      },
      slashCommand: {
        table: 'Tabelle',
      },
      tableMenu: {
        label: 'Tabellenoptionen',
        addRowAbove: 'Zeile oberhalb einfügen',
        addRowBelow: 'Zeile unterhalb einfügen',
        addColumnLeft: 'Spalte links einfügen',
        addColumnRight: 'Spalte rechts einfügen',
        alignColumn: 'Spalte ausrichten',
        alignNone: 'Keine',
        alignLeft: 'Links',
        alignCenter: 'Zentriert',
        alignRight: 'Rechts',
        deleteRow: 'Zeile löschen',
        deleteColumn: 'Spalte löschen',
        deleteTable: 'Tabelle löschen',
      },
    },
    sidebar: {
      newLabel: 'Neu',
      appActionsLabel: 'App-Aktionen',
      omniSearch: 'Omni-Suche',
      allCommands: 'Alle Befehle',
      settings: 'Einstellungen',
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
    settings: {
      title: 'Einstellungen',
      backToApp: 'Zurück zur App',
      general: {
        title: 'Allgemein',
        appearanceSection: 'Darstellung',
        themeTitle: 'Theme',
        themeDescription: 'Wählen Sie, wie Bangle auf diesem Gerät aussieht.',
        themeLabel: 'Theme-Einstellung',
        editorSection: 'Editor',
        wideEditorTitle: 'Editorbreite',
        wideEditorDescription:
          'Verfügbare Fensterbreite zum Bearbeiten von Notizen nutzen.',
        wideEditorToggle: 'Breiten Editor verwenden',
        defaultWidth: 'Standard',
        wideWidth: 'Breit',
        enabled: 'Aktiviert',
        disabled: 'Deaktiviert',
      },
      nav: {
        general: 'Allgemein',
      },
    },
    dialogs: {
      changeTheme: {
        searchPlaceholder: 'Wählen Sie eine Theme-Einstellung',
        title: 'Theme ändern',
        groupLabel: 'Themes',
        emptyMessage: 'Keine Themes verfügbar',
        options: {
          system: 'System',
          light: 'Hell',
          dark: 'Dunkel',
        },
      },
      createNote: {
        title: 'Notiz erstellen',
        description:
          'Benennen Sie die Notiz, bevor sie diesem Arbeitsbereich hinzugefügt wird.',
        inputLabel: 'Notizname',
        placeholder: 'Unbenannte Notiz',
        submitText: 'Erstellen',
      },
      deleteNote: {
        placeholder: 'Wählen oder tippen Sie eine Notiz zum Löschen',
        badgeText: 'Notiz löschen',
        groupHeading: 'Notizen',
        emptyMessage: 'Keine Notizen gefunden',
        hintDelete: 'Wählen Sie eine Notiz aus, um das Löschen zu bestätigen',
      },
      confirmDelete: {
        title: 'Löschen bestätigen',
        description: ({ fileName }: { fileName: string }) =>
          `Sind Sie sicher, dass Sie "${fileName}" löschen möchten?`,
        continueText: 'Löschen',
      },
      renameNote: {
        title: 'Notiz umbenennen',
        description: ({
          fileNameWithoutExtension,
        }: {
          fileNameWithoutExtension: string;
        }) => `Wählen Sie einen neuen Namen für „${fileNameWithoutExtension}“.`,
        inputLabel: 'Neuer Name',
        placeholder: 'Neuer Notizname',
        submitText: 'Umbenennen',
      },
      moveNote: {
        searchPlaceholder: 'Wählen Sie einen Pfad zum Verschieben der Notiz',
        title: ({
          fileNameWithoutExtension,
        }: {
          fileNameWithoutExtension: string;
        }) => `Verschieben von "${fileNameWithoutExtension}"`,
        emptyMessage:
          'Keine Ordner vorhanden, in die diese Notiz verschoben werden kann.',
        emptyActionText: 'Ordner erstellen',
        groupLabel: 'Verzeichnisse',
        hintClick: 'Enter drücken oder klicken',
        hintDrag:
          'Tipp: Versuchen Sie, eine Notiz in der Seitenleiste zu ziehen',
        hintCreateDirectory:
          'Erstellen Sie zuerst einen Ordner und verschieben Sie dann diese Notiz.',
      },
      createDirectory: {
        title: 'Ordner erstellen',
        description:
          'Fügen Sie einen Ordner hinzu, um Notizen in diesem Arbeitsbereich zu organisieren.',
        inputLabel: 'Ordnername',
        placeholder: 'Ordnername',
        submitText: 'Erstellen',
      },
      switchWorkspace: {
        searchPlaceholder: 'Wählen Sie einen Arbeitsbereich zum Wechseln',
        title: 'Arbeitsbereich wechseln',
        groupLabel: 'Arbeitsbereiche',
        emptyMessage: 'Keine Arbeitsbereiche gefunden',
      },
      deleteWorkspace: {
        searchPlaceholder: 'Wählen Sie einen Arbeitsbereich zum Löschen',
        title: 'Arbeitsbereich löschen',
        groupLabel: 'Arbeitsbereiche',
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
        selectTypeDescription:
          'Wählen Sie, wo dieser Arbeitsbereich seine Notizen speichert.',
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
        noNoteOpened: 'Derzeit ist keine Notiz geöffnet.',
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
      retrySave: 'Speichern erneut versuchen',
      saveFailed:
        'Änderungen konnten nicht gespeichert werden. Versuchen Sie es erneut, um Ihre letzte Änderung zu behalten.',
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
        mobileTitle: 'Seitenleiste',
        mobileDescription:
          'Arbeitsbereiche, Notizen und App-Aktionen navigieren.',
      },
      breadcrumb: {
        moreSr: 'Mehr',
      },
      tree: {
        renameAction: 'Umbenennen',
        deleteAction: 'Löschen',
        moveAction: 'Verschieben',
        createNoteAction: 'Notiz erstellen',
        moreActionsSr: ({ itemName }: { itemName: string }) =>
          `Weitere Aktionen für ${itemName}`,
      },
      dialog: {
        closeSr: 'Schließen',
        commandDescriptionSr:
          'Tippen Sie, um zu suchen und ein Element auszuwählen.',
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
