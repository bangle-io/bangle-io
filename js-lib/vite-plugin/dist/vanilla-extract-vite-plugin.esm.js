import path from 'path';
import { normalizePath } from 'vite';
import outdent from 'outdent';
import { getPackageInfo, cssFileFilter, transform, compile, processVanillaFile } from '@vanilla-extract/integration';

// Mostly copied from vite's implementation
// https://github.com/vitejs/vite/blob/efec70f816b80e55b64255b32a5f120e1cf4e4be/packages/vite/src/node/plugins/css.ts
const resolvePostcssConfig = async config => {
  var _config$css;

  // inline postcss config via vite config
  const inlineOptions = (_config$css = config.css) === null || _config$css === void 0 ? void 0 : _config$css.postcss;
  const inlineOptionsIsString = typeof inlineOptions === 'string';

  if (inlineOptions && !inlineOptionsIsString) {
    const options = { ...inlineOptions
    };
    delete options.plugins;
    return {
      options,
      plugins: inlineOptions.plugins || []
    };
  } else {
    try {
      const searchPath = typeof inlineOptions === 'string' ? inlineOptions : config.root;
      const postCssConfig = await (await import('postcss-load-config')).default({}, searchPath);
      return {
        options: postCssConfig.options,
        // @ts-expect-error - The postcssrc options don't agree with real postcss, but it should be ok
        plugins: postCssConfig.plugins
      };
    } catch (e) {
      if (!/No PostCSS Config found/.test(e.message)) {
        throw e;
      }

      return null;
    }
  }
};

const styleUpdateEvent = fileId => `vanilla-extract-style-update:${fileId}`;

const virtualExtCss = '.vanilla.css';
const virtualExtJs = '.vanilla.js';
function vanillaExtractPlugin({
  identifiers,
  esbuildOptions
} = {}) {
  let config;
  let server;
  let postCssConfig;
  const cssMap = new Map();
  let forceEmitCssInSsrBuild = !!process.env.VITE_RSC_BUILD;
  let packageName;

  const getAbsoluteVirtualFileId = source => normalizePath(path.join(config.root, source));

  return {
    name: 'vanilla-extract',
    enforce: 'pre',

    configureServer(_server) {
      server = _server;
    },

    config(_userConfig, env) {
      const include = env.command === 'serve' ? ['@vanilla-extract/css/injectStyles'] : [];
      return {
        optimizeDeps: {
          include
        },
        ssr: {
          external: ['@vanilla-extract/css', '@vanilla-extract/css/fileScope', '@vanilla-extract/css/adapter']
        }
      };
    },

    async configResolved(resolvedConfig) {
      config = resolvedConfig;
      packageName = getPackageInfo(config.root).name;

      if (config.command === 'serve') {
        postCssConfig = await resolvePostcssConfig(config);
      }

      if (config.plugins.some(plugin => ['astro:build', 'solid-start-server', 'vite-plugin-qwik'].includes(plugin.name))) {
        forceEmitCssInSsrBuild = true;
      }
    },

    resolveId(source) {
      const [validId, query] = source.split('?');

      if (!validId.endsWith(virtualExtCss) && !validId.endsWith(virtualExtJs)) {
        return;
      } // Absolute paths seem to occur often in monorepos, where files are
      // imported from outside the config root.


      const absoluteId = source.startsWith(config.root) ? source : getAbsoluteVirtualFileId(validId); // There should always be an entry in the `cssMap` here.
      // The only valid scenario for a missing one is if someone had written
      // a file in their app using the .vanilla.js/.vanilla.css extension

      if (cssMap.has(absoluteId)) {
        // Keep the original query string for HMR.
        return absoluteId + (query ? `?${query}` : '');
      }
    },

    load(id) {
      const [validId] = id.split('?');

      if (!cssMap.has(validId)) {
        return;
      }

      const css = cssMap.get(validId);

      if (typeof css !== 'string') {
        return;
      }

      if (validId.endsWith(virtualExtCss)) {
        return css;
      }

      return outdent`
        import { injectStyles } from '@vanilla-extract/css/injectStyles';

        const inject = (css) => injectStyles({
          fileScope: ${JSON.stringify({
        filePath: validId
      })},
          css
        });

        inject(${JSON.stringify(css)});

        if (import.meta.hot) {
          import.meta.hot.on('${styleUpdateEvent(validId)}', (css) => {
            inject(css);
          });
        }
      `;
    },

    async transform(code, id, ssrParam) {
      const [validId] = id.split('?');

      if (!cssFileFilter.test(validId)) {
        return null;
      }

      const identOption = identifiers !== null && identifiers !== void 0 ? identifiers : config.mode === 'production' ? 'short' : 'debug';
      let ssr;

      if (typeof ssrParam === 'boolean') {
        ssr = ssrParam;
      } else {
        ssr = ssrParam === null || ssrParam === void 0 ? void 0 : ssrParam.ssr;
      }

      if (ssr && !forceEmitCssInSsrBuild) {
        return transform({
          source: code,
          filePath: normalizePath(validId),
          rootPath: config.root,
          packageName,
          identOption
        });
      }

      const {
        source,
        watchFiles
      } = await compile({
        filePath: validId,
        cwd: config.root,
        esbuildOptions,
        identOption
      });

      for (const file of watchFiles) {
        // In start mode, we need to prevent the file from rewatching itself.
        // If it's a `build --watch`, it needs to watch everything.
        if (config.command === 'build' || file !== validId) {
          this.addWatchFile(file);
        }
      }

      const output = await processVanillaFile({
        source,
        filePath: validId,
        identOption,
        serializeVirtualCssPath: async ({
          fileScope,
          source
        }) => {
          const rootRelativeId = `${fileScope.filePath}${config.command === 'build' || ssr && forceEmitCssInSsrBuild ? virtualExtCss : virtualExtJs}`;
          const absoluteId = getAbsoluteVirtualFileId(rootRelativeId);
          let cssSource = source;

          if (postCssConfig) {
            const postCssResult = await (await import('postcss')).default(postCssConfig.plugins).process(source, { ...postCssConfig.options,
              from: undefined,
              map: false
            });
            cssSource = postCssResult.css;
          }

          if (server && cssMap.has(absoluteId) && cssMap.get(absoluteId) !== source) {
            const {
              moduleGraph
            } = server;
            const [module] = Array.from(moduleGraph.getModulesByFile(absoluteId) || []);

            if (module) {
              moduleGraph.invalidateModule(module); // Vite uses this timestamp to add `?t=` query string automatically for HMR.

              module.lastHMRTimestamp = module.lastInvalidationTimestamp || Date.now();
            }

            server.ws.send({
              type: 'custom',
              event: styleUpdateEvent(absoluteId),
              data: cssSource
            });
          }

          cssMap.set(absoluteId, cssSource); // We use the root relative id here to ensure file contents (content-hashes)
          // are consistent across build machines

          return `import "${rootRelativeId}";`;
        }
      });
      return {
        code: output,
        map: {
          mappings: ''
        }
      };
    }

  };
}

export { vanillaExtractPlugin };
