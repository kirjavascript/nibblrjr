const express = require('express');
const webpack = require('webpack');
const wdm = require('webpack-dev-middleware');
const reporter = require('webpack-dev-middleware/lib/reporter');
const webpackConfig = require('../../webpack.config.js')({dev:true});
const initSocket = require('./socket');
const { readFile } = require('fs');

function initWeb(parent) {

    const web = parent.web;

    const app = express();

    const server = app.listen(web.port, () => {
        console.log(`Server running on http://localhost:${web.port}/`)
    });

    web.wss = initSocket({parent, server});

    // TODO: servers message socket somehow

    // load webpack middleware

    if (parent.dev) {
        webpackConfig.mode = 'development'
        const compiler = webpack(webpackConfig);
        app.use(wdm(compiler, {
            reporter: (...args) => {
                reporter(...args);
                web.wss.sendAll({cmd: 'RELOAD'});
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

    // wildcard defaulting
    app.use('*', (req, res) => {
        readFile(__dirname + '/../static/index.html', 'utf8', (err, out) => {
            res.send(out);
        });
    });

    return web;
}

module.exports = {
    initWeb,
};
