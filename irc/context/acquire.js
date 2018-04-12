// this probably looks dangerous, but since we only ever end up passing a string to be evaluated, it is as safe as allowing any other arbitrary code to run

const npm = require('global-npm');
const path = require('path');
const webpack = require('webpack');
const fs = require('fs');
const { promisify } = require('util');

const readFileAsync = promisify(fs.readFile);
const existsAsync = promisify(fs.exists);
const moduleDir = 'acquire_cache';

// https://github.com/maxleiko/npmi/blob/master/npmi.js#L49

// load npm
let npmInstall, npmView;
npm.load({loglevel: 'silent', lock: false}, (err, success) => {
    if (err) {
        console.error(err);
    }
    else {
        npmInstall = promisify(npm.commands.install);
        npmView = promisify(npm.commands.view);
    }
});

// TODO: fs.readFile / new Function() {}
// TODO: expose in environment as a local?

const acquireFactory = (initFunc = source => source) => {
    return (input) => {
        const hasVersion = input.includes('@');
        const version = hasVersion ? input.replace(/^(.*?)@/, '') : 'latest';
        const name = hasVersion ? input.replace(/@(.*?)$/, '') : input;
        const module = `${name}@${version}`;

        return new Promise(async (resolve, reject) => {
            try {
                if (!npmInstall) {
                    return reject(new Error('aquire: npm not loaded'));
                }
                else if (version == 'latest') {
                    // check latest on npm and see if we have it
                    const info = await npmView([name], true);
                    const latest = Object.keys(info)[0];
                    const filename = path.resolve(moduleDir, `${name}@${latest}.js`);
                    if (await existsAsync(filename)) {
                        return resolve(
                            initFunc(await readFileAsync(filename))
                        );
                    }
                }
                else {
                    // check if we have the specific version
                    const filename = path.resolve(moduleDir, module + '.js');
                    if (await existsAsync(filename)) {
                        return resolve(
                            initFunc(await readFileAsync(filename))
                        );
                    }
                }
                const result = await npmInstall(moduleDir, [module]);
                const resultVersion = result[0][0].replace(/^(.*?)@/,'');
                const bundlename = `${name}@${resultVersion}.js`;
                const modulePath = path.resolve(moduleDir, 'node_modules', name);
                const packagePath = path.resolve(modulePath, 'package.json');
                // TODO: check file exists (fs module)
                const pkg = await readFileAsync(packagePath);
                const pkgJson = JSON.parse(pkg.toString());
                const entrypoint = pkgJson.main || 'index.js';
                webpack({
                    target: 'node',
                    entry: path.resolve(modulePath, entrypoint),
                    output: {
                        path: path.resolve(moduleDir),
                        filename: bundlename,
                        libraryTarget: 'umd',
                    },
                    mode: 'development',
                })
                .run(async (err, stats) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        // TODO: check exists
                        const filename = path.resolve(moduleDir, bundlename);
                        resolve(
                            initFunc(await readFileAsync(filename))
                        );
                    }
                });
            }
            catch (e) {
                reject(e);
            }
        });
    };
};

const acquire = acquireFactory(d => d);

setTimeout(() => {
    acquire('moment@1.0.0')
        .then((d) => {
            console.log(d.slice(0, 100).toString());
        })
        .catch(d => {
            console.error(d);
        });

}, 1000);
