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
    },
  },
} satisfies Translations;
