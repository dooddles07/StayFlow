//  @ts-check

import { tanstackConfig } from '@tanstack/eslint-config'

export default [
  ...tanstackConfig,
  {
    rules: {
      'import/no-cycle': 'off',
      'import/order': 'off',
      'sort-imports': 'off',
      '@typescript-eslint/array-type': 'off',
      '@typescript-eslint/require-await': 'off',
      'pnpm/json-enforce-catalog': 'off',
    },
  },
  {
    // Matches .gitignore's build/generated dirs — flat config doesn't read .gitignore
    // itself, so without this eslint parses compiled output as source and fails every
    // file in it ("parserOptions.project" not found for files outside tsconfig include).
    // server/ is plain JS with no tsconfig coverage — tanstackConfig's type-aware
    // parser fails every file in it ("parserOptions.project" not found). It needs its
    // own JS lint config (tracked separately); root lint stays scoped to the frontend.
    ignores: ['eslint.config.js', 'prettier.config.js', 'dist', 'dist-ssr', '.nitro', '.tanstack', '.wrangler', '.output', '.vinxi', 'server'],
  },
]
