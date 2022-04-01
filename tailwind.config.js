const path = require('path');

const { ALL_TOP_LEVEL_DIRS } = require('@bangle.io/scripts/constants');

module.exports = {
  theme: {
    extend: {},
  },
  variants: {},
  plugins: [],
  content: [
    ...ALL_TOP_LEVEL_DIRS.map((r) =>
      path.join(__dirname, `./${r}/**/*.{js,jsx,ts,tsx}`),
    ),
  ],
};
