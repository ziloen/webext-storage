import tailwindcss from '@tailwindcss/postcss'
import { build, context } from 'esbuild'
import { copy as CopyPlugin } from 'esbuild-plugin-copy'
import stylePlugin from 'esbuild-style-plugin'
import fsExtra from 'fs-extra'
import { execSync } from 'node:child_process'
import AutoImport from 'unplugin-auto-import/esbuild'
import { isDev, isFirefoxEnv, outDir, r } from './utils.js'

/**
 * @import { BuildOptions, Plugin } from 'esbuild'
 */

const cwd = process.cwd()

/**
 * @type {BuildOptions}
 */
const options = {
  entryPoints: [
    r('src/background/main.ts'),
    r('src/devtools/main.ts'),
    r('src/pages/devtools-panel/main.tsx'),
    r('src/pages/options/main.tsx'),
  ],
  legalComments: 'eof',
  supported: {
    nesting: false,
  },
  jsx: 'automatic',
  jsxDev: isDev,
  splitting: true,
  target: ['chrome100', 'es2022', 'firefox115'],
  format: 'esm',
  platform: 'browser',
  chunkNames: 'chunks/[name]-[hash]',
  treeShaking: true,
  bundle: true,
  assetNames: 'assets/[name]-[hash]',
  outbase: 'src',
  outdir: outDir,
  keepNames: isDev,
  drop: isDev ? [] : ['console', 'debugger'],
  logLevel: 'info',
  loader: {
    '.woff2': 'file',
  },
  plugins: [
    AutoImport({
      include: [
        /\.[tj]sx?$/, // .ts, .tsx, .js, .jsx
      ],
      imports: [
        {
          'webextension-polyfill': [['default', 'browser']],
        },
      ],
      dts: r('src/types/auto-imports.d.ts'),
      ignoreDts: ['browser'],
    }),

    CopyPlugin({
      resolveFrom: 'cwd',
      assets: [
        { from: 'public/**/*', to: outDir },
        { from: 'src/pages/**/*.html', to: r(outDir, 'pages') },
        { from: 'src/devtools/index.html', to: r(outDir, 'devtools') },
      ],
      watch: isDev,
    }),

    stylePlugin({
      postcss: {
        plugins: [tailwindcss],
      },
    }),
  ],
}

fsExtra.ensureDirSync(outDir)
fsExtra.emptyDirSync(outDir)
writeManifest()

if (isDev) {
  context(options).then((ctx) => ctx.watch())

  fsExtra.watchFile(r('scripts/gen-manifest.ts'), () => {
    writeManifest()
  })
} else {
  build(options)
}

function writeManifest() {
  execSync('node --experimental-strip-types ./scripts/gen-manifest.ts', {
    stdio: 'inherit',
  })
}
