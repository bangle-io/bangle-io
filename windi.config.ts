import path from 'node:path';
import { defineConfig } from 'windicss/helpers';

import { vars } from '@bangle.io/ui-vars';
import { topLevelDirs } from '@bangle.io/yarn-workspace-helpers';

console.log(vars.space);
export default defineConfig({
  plugins: [],
  theme: {
    // TODO add breakpoints
    spacing: vars.space,
    // borderRadius: vars.border.radius,
    // borderWidth: vars.border.width,
    // borderColor: vars.border.color,
    // boxShadow: vars.shadows,
    // backgroundColor: vars.color.background,
    // textColor: vars.color.foreground,
    // fontSize: Object.fromEntries(
    //   Object.entries(vars.typography.text).map((r) => [r[0], r[1].size]),
    // ),
    // lineHeight: Object.fromEntries(
    //   Object.entries(vars.typography.text).map((r) => [r[0], r[1].height]),
    // ),
  },
  extract: {
    include: [
      ...topLevelDirs.map((r) =>
        path.join(__dirname, `./${r}/**/*.{js,jsx,ts,tsx}`),
      ),
    ],
  },
});
