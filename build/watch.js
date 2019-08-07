const exec = require('child_process').exec;
const chalk = require('chalk');
const rollup = require('rollup');
const configs = require('./configs');

const options = {
    ...configs.umdDev.input,
    output: configs.umdDev.output,
    watch: {
        includes: 'src/**',
        exclude: 'node_modules/**', // 排除监听的文件夹
    },
}; // 生成rollup的options

const watcher = rollup.watch(options); // 调用rollup的api启动监听

watcher.on('event', event => {
    if (event.code === 'END') {
        console.log(chalk.cyan('正在重新构建...'));
        exec('npm run build', function(error, stdout) {
            console.log(stdout);
            console.log(chalk.green('构建完成'));
            error && console.error(error);
        });
    }
});
