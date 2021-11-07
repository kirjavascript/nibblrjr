const { readFile } = require('fs');
const express = require('express');
const bodyParser = require('body-parser');
const initSocket = require('./socket');
const initAPI = require('./api');
const esbuild = require('esbuild');
const sassPlugin = require('esbuild-plugin-sass');
const path = require('path');

function initWeb(parent) {
    const { web } = parent;

    const app = express();

    app.use(bodyParser.json());

    const server = app.listen(web.port, () => {
        console.log(`Web running on port ${web.port}`);
    });

    web.wss = initSocket({ parent, server });
    initAPI({ parent, app });

    // load webpack middleware

    if (!parent.noWebpack && parent.dev) {
        esbuild
            .build({
                entryPoints: [path.resolve(__dirname, '../modules/main.js')],
                bundle: true,
                platform: 'browser',
                format: 'cjs',
                watch: true,
                outfile: path.resolve(__dirname, '../static/main.js'),
                minify: true,
                jsx: 'transform',
                plugins: [
                    {
                        name: 'web',
                        setup(build) {
                            build.onResolve({ filter: /\.woff2$/ }, (args) => {
                                return { external: true };
                            });
                        },
                    },
                    sassPlugin(),
                ],
                loader: {
                    '.js': 'jsx',
                },
            })
            .then(console.info)
            .catch(console.error);
    }

    // assign static asset folder

    app.use('/', express.static(__dirname + '/../static'));

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
