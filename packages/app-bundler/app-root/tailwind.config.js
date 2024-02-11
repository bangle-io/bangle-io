const path = require('path');
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class', '.BU_dark-scheme'],

  content: {
    relative: true,
    files: ['!../../**/node_modules', '../../**/*.{ts,tsx,html}'],
  },
  theme: {
    extend: {
      colors: {
        gray: {
          50: 'var(--BV-gray-50)',
          75: 'var(--BV-gray-75)',
          100: 'var(--BV-gray-100)',
          200: 'var(--BV-gray-200)',
          300: 'var(--BV-gray-300)',
          400: 'var(--BV-gray-400)',
          500: 'var(--BV-gray-500)',
          600: 'var(--BV-gray-600)',
          700: 'var(--BV-gray-700)',
          800: 'var(--BV-gray-800)',
          900: 'var(--BV-gray-900)',
        },
      },
      borderWidth: {
        1: '1px',
        3: '3px',
      },
    },
  },
  plugins: [require('tailwindcss-react-aria-components')],
};
