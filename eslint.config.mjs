import { react } from '@ziloen/eslint-config'

/** @type { import("@ziloen/eslint-config").FlatESLintConfig[] } */
export default [
  ...react({ project: ['./tsconfig.json', './scripts/tsconfig.json'] }),
]
