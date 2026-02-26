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
  {
    files: ['src/scenes/game/application/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['warn', {
        patterns: [
          {
            group: ['@client/scenes/game/hooks/*', '@client/scenes/game/hooks/**'],
            message: 'application層からhooks層への依存は禁止です',
          },
          {
            group: ['@client/scenes/game/input/*', '@client/scenes/game/input/**'],
            message: 'application層からinput層への依存は禁止です',
          },
          {
            group: ['@client/scenes/game/styles/*', '@client/scenes/game/styles/**'],
            message: 'application層からstyles層への依存は禁止です',
          },
          {
            group: ['@client/scenes/game/GameScene', '@client/scenes/game/GameView'],
            message: 'application層からシーンUI層への依存は禁止です',
          },
        ],
      }],
    },
  },
  {
    files: ['src/scenes/game/entities/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['warn', {
        patterns: [
          {
            group: ['@client/scenes/game/hooks/*', '@client/scenes/game/hooks/**'],
            message: 'entities層からhooks層への依存は禁止です',
          },
          {
            group: ['@client/scenes/game/input/*', '@client/scenes/game/input/**'],
            message: 'entities層からinput層への依存は禁止です',
          },
          {
            group: ['@client/scenes/game/styles/*', '@client/scenes/game/styles/**'],
            message: 'entities層からstyles層への依存は禁止です',
          },
          {
            group: ['@client/scenes/game/GameScene', '@client/scenes/game/GameView'],
            message: 'entities層からシーンUI層への依存は禁止です',
          },
        ],
      }],
    },
  },
];
