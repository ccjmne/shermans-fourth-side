/*
npm install --save-dev \
eslint \
eslint-config-airbnb-base \
eslint-config-airbnb-typescript \
@typescript-eslint/eslint-plugin \
@typescript-eslint/parser eslint
*/

module.exports = {
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
        moduleDirectory: ['node_modules', 'src', ''],
      },
    },
  },
  extends: [
    'airbnb-base',
    'airbnb-typescript/base',
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
  ],
  env: { es2021: true },
  plugins: ['@typescript-eslint/eslint-plugin'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json',
    ecmaVersion: 2021,
    sourceType: 'module',
    ecmaFeatures: {
      impliedStrict: true,
    },
  },
  ignorePatterns: ['!.stylelintrc.js'], // include .stylelintrc.js
  rules: {
    ...{
      // newlines
      'linebreak-style': ['warn', 'unix'],
      'lines-between-class-members': ['warn', 'always', { exceptAfterSingleLine: true }],
      '@typescript-eslint/lines-between-class-members': 'off', // I prefer base lines-between-class-members, which accepts exceptAfterSingleLine
      '@typescript-eslint/padding-line-between-statements': ['warn',
        { blankLine: 'always', prev: '*', next: 'return' },
        { blankLine: 'any', prev: 'singleline-const', next: 'return' },
        { blankLine: 'always', prev: '*', next: 'if' },
        { blankLine: 'any', prev: 'singleline-const', next: 'if' },
        { blankLine: 'always', prev: '*', next: 'do' },
        { blankLine: 'any', prev: 'singleline-const', next: 'do' },
        { blankLine: 'always', prev: '*', next: 'while' },
        { blankLine: 'any', prev: 'singleline-const', next: 'while' },
        { blankLine: 'always', prev: '*', next: 'try' },
        { blankLine: 'any', prev: 'singleline-const', next: 'try' },
        { blankLine: 'always', prev: '*', next: 'throw' },
        { blankLine: 'always', prev: 'break', next: '*' },
        { blankLine: 'always', prev: 'directive', next: '*' },
        { blankLine: 'any', prev: 'directive', next: 'directive' },
      ],
      'padded-blocks': ['warn', { blocks: 'never', switches: 'never', classes: 'always' }],
      'object-curly-newline': ['warn', {
        ImportDeclaration: 'never',
        ObjectExpression: { consistent: true, multiline: true },
        ObjectPattern: { consistent: true, multiline: true },
      }],
    },
    ...{
      // inline spacing
      'object-curly-spacing': 'off',
      '@typescript-eslint/object-curly-spacing': ['warn', 'always'],
      '@typescript-eslint/type-annotation-spacing': ['warn'],
    },
    ...{
      // code style
      'arrow-parens': ['warn', 'as-needed'],
      'comma-dangle': ['warn', 'always-multiline'],
      '@typescript-eslint/consistent-type-assertions': ['error', {
        assertionStyle: 'as',
        objectLiteralTypeAssertions: 'allow-as-parameter',
      }],
      // '@typescript-eslint/consistent-type-imports': ['warn'], // wait until import/no-duplicate can auto-merge type imports
      '@typescript-eslint/explicit-function-return-type': ['warn', { allowExpressions: true }],
      'import/extensions': ['warn', 'never'],
      'import/order': ['warn', {
        'groups': ['builtin', 'external', 'internal', 'unknown', 'parent', 'sibling', 'index', 'object'],
        'newlines-between': 'always-and-inside-groups',
        'alphabetize': { order: 'asc' },
      }],
      'import/prefer-default-export': 'off',
      'import/no-default-export': ['warn'],
      'indent': 'off',
      '@typescript-eslint/indent': ['warn', 2, { SwitchCase: 0 }],
      'max-len': ['warn', 140, 4, {
        ignoreTrailingComments: true,
        ignorePattern: '^import\\b|^export\\s\\{.*?\\}\\sfrom\\s',
        ignoreUrls: true,
        ignoreTemplateLiterals: true,
        ignoreRegExpLiterals: true,
      }],
      'no-floating-decimal': 'off',
      '@typescript-eslint/member-delimiter-style': ['warn', { singleline: { delimiter: 'comma' }, multilineDetection: 'last-member' }],
      'object-property-newline': ['warn'],
      '@typescript-eslint/prefer-readonly': ['warn'],
      '@typescript-eslint/prefer-ts-expect-error': ['warn'],
      'quotes': ['warn', 'single', { allowTemplateLiterals: true, avoidEscape: true }],
      'quote-props': ['warn', 'consistent-as-needed'],
      'semi': 'off',
      '@typescript-eslint/semi': ['warn', 'always'],
      '@typescript-eslint/strict-boolean-expressions': ['warn'],
    },
    ...{
      // code smells
      'class-methods-use-this': ['error', { exceptMethods: ['connectedCallback', 'disconnectedCallback'] }],
      'default-case': 'off', // in ts projects, prefer @typescript-eslint/switch-exhaustiveness-check
      '@typescript-eslint/switch-exhaustiveness-check': ['error'],
      'func-names': ['warn', 'as-needed'],
      'global-require': 'off', // deprecated, see https://eslint.org/docs/rules/global-require
      'import/no-extraneous-dependencies': ['warn', { devDependencies: true }],
      'no-empty-function': 'off',
      '@typescript-eslint/no-empty-function': ['error'],
      'no-unused-private-class-members': ['error'],
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { vars: 'all', args: 'all', argsIgnorePattern: '^_' }],
      'no-use-before-define': 'off',
      '@typescript-eslint/no-use-before-define': ['error', { ignoreTypeReferences: true }],
      'no-useless-constructor': 'off',
      '@typescript-eslint/no-useless-constructor': ['error'],
      'no-shadow': 'off',
      '@typescript-eslint/no-shadow': ['error', { allow: ['_'] }],
    },
  },
  overrides: [{
    files: ['{webpack,vite}.config.ts', 'tooling/**/*.{js,ts}', '**/*.d.ts'],
    rules: {
      'import/no-extraneous-dependencies': ['warn', { devDependencies: true }],
      'import/no-default-export': 'off',
    },
  }],
};
