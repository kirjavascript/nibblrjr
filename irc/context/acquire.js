const npm = require('npm');
const path = require('path');
const webpack = require('webpack');
const fs = require('fs');
const moduleDir = 'acquire_cache';

// https://github.com/maxleiko/npmi/blob/master/npmi.js#L49

let npmLoaded = false;
npm.load({loglevel: 'silent', lock: false}, (err, success) => {
    if (err) {
        console.error(err);
    }
    else {
        npmLoaded = true;
    }
});

const acquire = (name, version = 'latest') => {
    // TODO: if version is latest, check what latest version is
    const module = `${name}@${version}`;
    const bundlename = `__bundle@${version}.js`;
    // TODO: check exists, dump if so, download if not __bundle@version.js
    // TODO: check escapes (fs, proto climb)
    return new Promise((resolve, reject) => {
        if (!npmLoaded) {
            reject(new Error('aquire: npm not loaded'));
        }
        npm.commands.install(moduleDir, [module], (err, result) => {
            if (err) {
                reject(err);
            }
            else {
                const modulePath = path.resolve(moduleDir, 'node_modules', name);
                const packagePath = path.resolve(modulePath, 'package.json');
                fs.readFile(packagePath, (err, pkg) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        const pkgJson = JSON.parse(pkg.toString());
                        const entrypoint = pkgJson.main || 'index.js';
                        webpack({
                            target: 'node',
                            entry: path.resolve(modulePath, entrypoint),
                            output: {
                                path: modulePath,
                                filename: bundlename,
                                libraryTarget: 'umd',
                            },
                            mode: 'development',
                        })
                        .run((err, stats) => {
                            if (err) {
                                reject(err);
                            }
                            else {
                                resolve(
                                    // TODO: fs.readFile / new Function() {}
                                    require(
                                        path.resolve(modulePath, bundlename)
                                    )
                                );
                            }
                        });
                    }
                });
            }
        });
    });
};

setTimeout(() => {
    acquire('fs')
        .then(d => {
            console.log(d);
        })
        .catch(d => {
            console.error(d);
        });

}, 1000);
