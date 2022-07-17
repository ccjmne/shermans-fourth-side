/*
npm install --save-dev \
style-loader \
stylelint-config-idiomatic-order \
stylelint-config-standard-scss \
stylelint-order
*/

module.exports = {
  plugins: [
    'stylelint-order',
    'stylelint-scss',
  ],
  extends: [
    'stylelint-config-standard-scss',
    'stylelint-config-idiomatic-order',
  ],
  rules: {
    'declaration-block-no-duplicate-properties': true,
  },
};
