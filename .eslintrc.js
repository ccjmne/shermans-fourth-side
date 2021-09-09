module.exports = {
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
        moduleDirectory: ['node_modules', 'src/'],
      },
    },
  },
  extends: [
    'eslint:recommended',
    'airbnb-base',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/eslint-recommended',
  ],
  env: { es2021: true },
  plugins: ['@typescript-eslint/eslint-plugin'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
    ecmaFeatures: {
      impliedStrict: true,
    },
  },
  rules: {
    ...{
      // ts overrides
      'no-empty-function': 'off',
      '@typescript-eslint/no-empty-function': ['error'],
      'no-useless-constructor': 'off',
      '@typescript-eslint/no-useless-constructor': ['error'],
      'no-shadow': 'off',
      '@typescript-eslint/no-shadow': ['error', { allow: ['_'] }],
    },
    ...{
      // newlines
      'linebreak-style': ['error', 'unix'],
      'lines-between-class-members': ['warn', 'always', { exceptAfterSingleLine: true }],
      'padded-blocks': ['error', { blocks: 'never', switches: 'never', classes: 'always' }],
      'object-curly-newline': ['error', {
        ImportDeclaration: 'never',
        ObjectExpression: { consistent: true, multiline: true },
        ObjectPattern: { consistent: true, multiline: true },
      }],
    },
    ...{
      // code style
      'arrow-parens': ['error', 'as-needed'],
      'comma-dangle': ['error', 'always-multiline'],
      'import/extensions': ['error', 'never'],
      'import/order': ['error', {
        'groups': ['builtin', 'external', 'internal', 'unknown', 'parent', 'sibling', 'index', 'object'],
        'newlines-between': 'always-and-inside-groups',
        'alphabetize': { order: 'asc' },
      }],
      'indent': ['error', 2],
      'max-len': ['error', 140, 4, {
        ignoreTrailingComments: true,
        ignorePattern: '^import\\s',
        ignoreUrls: true,
        ignoreTemplateLiterals: true,
        ignoreRegExpLiterals: true,
      }],
      'quotes': ['error', 'single', { allowTemplateLiterals: true, avoidEscape: true }],
      'quote-props': ['error', 'consistent-as-needed'],
      'semi': ['error', 'always'],
    },
    ...{
      // code smells
      'class-methods-use-this': ['error', { exceptMethods: ['connectedCallback', 'disconnectedCallback'] }],
      'func-names': ['warn', 'as-needed'],
      'global-require': ['off'], // deprecated, see https://eslint.org/docs/rules/global-require
      'import/no-extraneous-dependencies': ['error', { devDependencies: ['webpack.config.ts'] }],
    },
  },
};
