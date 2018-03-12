const express = require('express');
const webpack = require('webpack');
const wdm = require('webpack-dev-middleware');
const reporter = require('webpack-dev-middleware/lib/reporter');
const webpackConfig = require('../../webpack.config.js')({dev:true});
const initSocket = require('./socket');

function initWeb(parent) {

    const { port, url, password, secretKey } = parent.web;

    const app = express();

    const server = app.listen(port, () => {
        console.log(`Server running on http://localhost:${port}/`)
    });

    const wss = initSocket({parent, server});

    // load webpack middleware

    if (parent.dev) {
        webpackConfig.mode = 'development'
        const compiler = webpack(webpackConfig);
        app.use(wdm(compiler, {
            reporter: (...args) => {
                reporter(...args);
                wss.sendAll({cmd: 'RELOAD'});
            },
        }));
    }
    else {
        webpackConfig.mode = 'production'
        const compiler = webpack(webpackConfig);
        compiler.run((err, stats) => {
            err && console.error(err);
        });
    }

    // assign static asset folders //

    app.use('/', express.static(__dirname + '/../static'))
        .use('/', express.static(__dirname + '/../bundles'));

}

module.exports = {
    initWeb,
};
