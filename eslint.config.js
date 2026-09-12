const expoConfig = require('eslint-config-expo/flat');
const typescriptPlugin = require('@typescript-eslint/eslint-plugin');

module.exports = [
  ...expoConfig,
  { ignores: ['node_modules/**', 'dist/**', '.expo/**', 'coverage/**'] },
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: { '@typescript-eslint': typescriptPlugin },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
];
