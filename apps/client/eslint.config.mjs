import tsParser from '@typescript-eslint/parser';
import preferRelativeForLocalClientPath from './eslint-rules/prefer-relative-for-local-client-path.js';

export default [
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      local: {
        rules: {
          'prefer-relative-for-local-client-path': preferRelativeForLocalClientPath,
        },
      },
    },
    rules: {
      'local/prefer-relative-for-local-client-path': 'warn',
    },
  },
];
