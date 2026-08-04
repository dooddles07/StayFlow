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
    // server/ has its OWN eslint.config.js (plain JS, no tsconfig coverage) — a `files:`
    // override here can't fully unseat tanstackConfig's type-aware parser block since
    // flat config merges (not replaces) matching configs, so it gets its own config
    // file and its own `npm run lint:server` script instead.
    ignores: ['eslint.config.js', 'prettier.config.js', 'dist', 'dist-ssr', '.nitro', '.tanstack', '.wrangler', '.output', '.vinxi', 'server'],
  },
]
