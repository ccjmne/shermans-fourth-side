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
    'class-methods-use-this': ['error', { exceptMethods: ['connectedCallback', 'disconnectedCallback'] }],
    'no-empty-function': 'off',
    '@typescript-eslint/no-empty-function': ['error'],
    'arrow-parens': ['error', 'as-needed'],
    'comma-dangle': ['error', 'always-multiline'],
    'import/no-extraneous-dependencies': ['error', { devDependencies: ['webpack.config.ts'] }],
    'quotes': ['error', 'single', { allowTemplateLiterals: true, avoidEscape: true }],
    'indent': ['error', 2],
    'import/extensions': ['error', 'never'],
    'semi': ['error', 'always'],
    'max-len': ['warn', 140, { ignoreTrailingComments: true, ignorePattern: '^import .*' }],
    'func-names': ['warn', 'as-needed'],
    'no-shadow': 'off',
    '@typescript-eslint/no-shadow': ['error', { allow: ['_'] }],
    'linebreak-style': ['error', 'unix'],
    'quote-props': ['error', 'consistent-as-needed'],
    'object-curly-newline': ['error', {
      ImportDeclaration: 'never',
      ObjectExpression: { consistent: true, multiline: true },
      ObjectPattern: { consistent: true, multiline: true },
    }],
    'global-require': ['off'], // deprecated, see https://eslint.org/docs/rules/global-require
  },
};
