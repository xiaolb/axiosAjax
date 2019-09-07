const typescript = require('rollup-plugin-typescript');
const path = require('path');
const babel = require('rollup-plugin-babel');
const buble = require('rollup-plugin-buble');
const replace = require('rollup-plugin-replace');
const commonjs = require('rollup-plugin-commonjs');
const nodeResolve = require('rollup-plugin-node-resolve');

const version = process.env.VERSION || require('../package.json').version;

const banner = `/**
 * util/ajax v${version}
 * (c) ${new Date().getFullYear()} xiekaifeng4042
 */`;

const resolve = _path => path.resolve(__dirname, '../', _path);

const configs = {
    umdDev: {
        input: resolve('src/index.js'),
        file: resolve('dist/topsAjax.js'),
        format: 'umd',
        env: 'development',
    },
    umdProd: {
        input: resolve('src/index.js'),
        file: resolve('dist/topsAjax.min.js'),
        format: 'umd',
        env: 'production',
    },
    commonjs: {
        input: resolve('src/index.js'),
        file: resolve('dist/topsAjax.common.js'),
        format: 'cjs',
    },
    // esm: {
    //     input: resolve('src/index.esm.js'),
    //     file: resolve('dist/topsAjax.esm.js'),
    //     format: 'es',
    // },
};

function genConfig(opts) {
    const config = {
        input: {
            input: opts.input,
            external: ['axios'],

            plugins: [
                nodeResolve({
                    mainFields: ['module', 'jsnext:main', 'browser', 'main'],
                }),
                commonjs(),
                replace({
                    __VERSION__: version,
                }),
                typescript(),
                babel({
                    babelrc: true,
                    runtimeHelpers: true,
                    exclude: 'node_modules/**',
                    extensions: ['.js', 'ts'],
                }),
                buble({
                    transforms: {
                        generator: false,
                    },
                }),
            ],
        },
        output: {
            banner,
            file: opts.file,
            format: opts.format,
            globals: {
                axios: 'axios',
            },
            name: 'topsAjax',
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
