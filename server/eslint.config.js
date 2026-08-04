import js from '@eslint/js'
import globals from 'globals'

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: {
      // ignoreRestSiblings: the `const { secret, ...safe } = obj` idiom (auth.controller.js's
      // sanitize(), resident.model.js's update()) intentionally destructures fields only to
      // drop them. argsIgnorePattern: Express identifies error-handling middleware by
      // function arity (4 params) — error.middleware.js's `next` must stay in the signature
      // even though it's never called.
      'no-unused-vars': ['error', { ignoreRestSiblings: true, argsIgnorePattern: '^next$' }],
    },
  },
]
