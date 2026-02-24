import tsParser from '@typescript-eslint/parser';
import preferRelativeForLocalServerPath from './eslint-rules/prefer-relative-for-local-server-path.mjs';

export default [
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    plugins: {
      local: {
        rules: {
          'prefer-relative-for-local-server-path': preferRelativeForLocalServerPath,
        },
      },
    },
    rules: {
      'local/prefer-relative-for-local-server-path': 'warn',
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'socket.io',
              message:
                'socket.io の import は network 配下のみにしてください。',
            },
            {
              name: 'socket.io-client',
              message:
                'socket.io-client の import は network 配下のみにしてください。',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/network/**/*.ts'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
];