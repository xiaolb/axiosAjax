// https://eslint.org/docs/user-guide/configuring
/**
 * 如果有冲突 prettier 可以在冲突的上面加// prettier-ignore
 */
const path = require('path');
module.exports = {
    root: true,
    parser: 'babel-eslint',
    parserOptions: {
        sourceType: 'module',
        allowImportExportEverywhere: true,
    },
    extends: ['@util/es6'],

    rules: {
        'func-names': [0],
    },
};
