// de.ts
import type { Translations } from '../types';

export const t = {
  meta: {
    lang: 'German',
    testCallback: ({ name }: { name: string }) => {
      return `Hallo ${name}`;
    },
  },
  app: {
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
  },
} satisfies Translations;
