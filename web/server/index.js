const { readFile } = require('fs');
const express = require('express');
const bodyParser = require('body-parser');
const initAPI = require('./api');
const initPasta = require('./pasta');
const esbuild = require('esbuild');
const sassPlugin = require('esbuild-plugin-sass');
const path = require('path');

function initWeb(parent) {
    const { web } = parent.config;

    const app = express();

    app.use(bodyParser.json());

    const server = app.listen(web.port, () => {
        console.log(`web running on port ${web.port}`);
    });

    initAPI({ parent, app });
    initPasta({ parent, app });

    // load esbuild middleware

    if (parent.dev) {
        esbuild
            .build({
                entryPoints: [path.resolve(__dirname, '../modules/main.js')],
                outfile: path.resolve(__dirname, '../static/main.js'),
                bundle: true,
                minify: true,
                platform: 'browser',
                format: 'cjs',
                watch: {
                    onRebuild() {
                        console.log('esrebuilt');
                    },
                },
                plugins: [sassPlugin()],
                loader: {
                    '.js': 'jsx',
                    '.woff2': 'file',
                },
            })
            .then(() => console.log('esbuilt'))
            .catch(console.error);
    }

    // assign static asset folder

    app.use('/', express.static(__dirname + '/../static'));

    // html pasta

    // wildcard defaulting

    app.use('*', (_req, res) => {
        readFile(__dirname + '/../static/index.html', 'utf8', (err, out) => {
            res.send(out);
        });
    });

    return server;
}

module.exports = {
    initWeb,
};
