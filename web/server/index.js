const { readFile } = require('fs');
const express = require('express');
const bodyParser = require('body-parser');
const webpack = require('webpack');
const wdm = require('webpack-dev-middleware');
const reporter = require('webpack-dev-middleware/lib/reporter');
const initSocket = require('./socket');
const initAPI = require('./api');

function initWeb(parent) {

    const { web } = parent;

    const app = express();

    app.use(bodyParser.json());

    const server = app.listen(web.port, () => {
        console.log(`Web running on port ${web.port}`);
    });

    web.wss = initSocket({parent, server});
    initAPI({ parent, app });

    // load webpack middleware

    if (!parent.noWebpack) {
        if (parent.dev) {
            const webpackConfig = require('../../webpack.config.js')({dev: true});
            webpackConfig.mode = 'development'
            const compiler = webpack(webpackConfig);
            app.use(wdm(compiler, {
                reporter: (...args) => {
                    reporter(...args);
                    web.wss.sendAll('RELOAD');
                },
            }));

            app.use('/', express.static(__dirname + '/../bundles'));
        }
    }

    // assign static asset folder

    app.use('/', express.static(__dirname + '/../static'))

    // wildcard defaulting

    app.use(/^(?!\/api)/, (_req, res) => {
        readFile(__dirname + '/../static/index.html', 'utf8', (err, out) => {
            res.send(out);
        });
    });

    return web;
}

module.exports = {
    initWeb,
};
