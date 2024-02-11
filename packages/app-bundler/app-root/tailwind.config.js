const path = require('path');
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: {
    relative: true,
    files: ['!../../**/node_modules', '../../**/*.{ts,tsx,html}'],
  },
  theme: {
    extend: {},
  },
  plugins: [require('tailwindcss-react-aria-components')],
};
