const postcss = require('postcss');
const prettier = require('prettier');

const postcssDiscardComments = require('postcss-discard-comments');

/**
 * Parses css variables from a css file
 * This is not a generic extract function, donot use it unless you are sure of what you are doing
 * @param {string} cssContent
 * @returns Promise<Array<[string,string]>>
 */
async function extractCSSVars(cssContent) {
  const rmComments = async (content) => {
    return (
      await postcss([postcssDiscardComments({ removeAll: true })]).process(
        cssContent,

        { from: undefined },
      )
    ).css;
  };

  const cssVarsContent = await rmComments(cssContent);

  // run through prettier to make it easy to read by making the
  // css var occupy a single line by having a really large printWidth
  const lines = prettier
    .format(cssVarsContent, {
      parser: 'css',
      printWidth: 9999,
    })
    .trim()
    .split('\n')
    .map((r) => r.trim())
    .filter(Boolean);

  let cssVars = new Map();
  for (const line of lines) {
    if (line.startsWith('--') && line.endsWith(';')) {
      const [varName, varValue] = line.slice(2, -1).split(': ');

      cssVars.set(varName, varValue);
      continue;
    }

    if (line.startsWith('}') || line === ':root {') {
      continue;
    }
    console.log('Unknown css line', line);
  }

  return Array.from(cssVars.entries());
}

module.exports = { extractCSSVars };
