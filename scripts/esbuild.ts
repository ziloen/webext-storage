import tailwindcss from '@tailwindcss/postcss'
import type { BuildOptions, Plugin } from 'esbuild'
import { build, context } from 'esbuild'
import { copy as CopyPlugin } from 'esbuild-plugin-copy'
import stylePlugin from 'esbuild-style-plugin'
import fsExtra from 'fs-extra'
import { execSync } from 'node:child_process'
import AutoImport from 'unplugin-auto-import/esbuild'
import { isDev, isFirefoxEnv, r } from './utils'

const cwd = process.cwd()
const outdir = r('dist/dev')

const options: BuildOptions = {
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
  outdir: outdir,
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
    }) as Plugin,

    CopyPlugin({
      resolveFrom: 'cwd',
      assets: [
        { from: 'public/**/*', to: 'dist/dev' },
        { from: 'src/pages/**/*.html', to: 'dist/dev/pages' },
        { from: 'src/devtools/index.html', to: 'dist/dev/devtools' },
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

fsExtra.ensureDirSync(outdir)
fsExtra.emptyDirSync(outdir)
writeManifest()

if (isDev) {
  context(options).then((ctx) => ctx.watch())

  fsExtra.watchFile(r('src/manifest.ts'), () => {
    writeManifest()
  })
} else {
  build(options)
}

function writeManifest() {
  console.log('write manifest')
  execSync('tsx ./scripts/manifest.ts', { stdio: 'inherit' })
}
