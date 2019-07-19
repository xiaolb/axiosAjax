const typescript = require('rollup-plugin-typescript');
const path = require('path');
const babel = require('rollup-plugin-babel');
const buble = require('rollup-plugin-buble');
const replace = require('rollup-plugin-replace');

const version = process.env.VERSION || require('../package.json').version;

const banner = `/**
 * utils/transfer-remote v${version}
 * (c) ${new Date().getFullYear()} xiekaifeng4042
 */`;

const resolve = _path => path.resolve(__dirname, '../', _path);

const configs = {
    umdDev: {
        input: resolve('src/index.js'),
        file: resolve('dist/transferRemote.js'),
        format: 'umd',
        env: 'development',
    },
    umdProd: {
        input: resolve('src/index.js'),
        file: resolve('dist/transferRemote.min.js'),
        format: 'umd',
        env: 'production',
    },
    commonjs: {
        input: resolve('src/index.js'),
        file: resolve('dist/transferRemote.common.js'),
        format: 'cjs',
    },
    esm: {
        input: resolve('src/index.esm.js'),
        file: resolve('dist/transferRemote.esm.js'),
        format: 'es',
    },
};

function genConfig(opts) {
    const config = {
        input: {
            input: opts.input,
            plugins: [
                replace({
                    __VERSION__: version,
                }),
                typescript(),
                babel({
                    babelrc: true,
                    runtimeHelpers: true,
                }),

                buble(),
            ],
        },
        output: {
            banner,
            file: opts.file,
            format: opts.format,
            name: 'utils',
        },
    };

    if (opts.env) {
        config.input.plugins.unshift(
            replace({
                'process.env.NODE_ENV': JSON.stringify(opts.env),
            })
        );
    }

    return config;
}

function mapValues(obj, fn) {
    const res = {};
    Object.keys(obj).forEach(key => {
        res[key] = fn(obj[key], key);
    });
    return res;
}

module.exports = mapValues(configs, genConfig);
