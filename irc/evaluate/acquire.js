// this probably looks dangerous, but since we only ever end up passing a string to be evaluated, it is as safe as allowing any other arbitrary code to run

const npm = require('global-npm');
const path = require('path');
const webpack = require('webpack');
const fs = require('fs');
const semver = require('semver');
const { promisify } = require('util');

const readFileAsync = promisify(fs.readFile);
const existsAsync = promisify(fs.exists);
const mkdirAsync = promisify(fs.mkdir);
const readdirAsync = promisify(fs.readdir);

const moduleDir = __dirname + '/../../cache/acquire';
const stubbed = require('module').builtinModules;

// load npm
let npmInstall, npmView;
npm.load({loglevel: 'silent', lock: false}, (err, success) => {
    if (err) {
        console.error(err);
    }
    else {
        npmInstall = promisify(npm.commands.install);
        npmView = promisify(npm.commands.view);
        // disable an attack vector
        npm.config.set('ignore-scripts', true);
    }
});

function acquire(input) {
    if (!input.length || input.startsWith('.') || input.startsWith('_') || /[~\(\)'!\*]/.test(input) || input.includes('..')) {
        throw new Error('Invalid package name');
    }
    const isNamespaced = input[0] == '@';
    const hasVersion = input.indexOf('@') > 0;
    const version = hasVersion ? input.replace(/^.+?@/, '') : 'latest';
    const nameBase = hasVersion ? input.replace(/@.*?$/, '') : input;
    const name = nameBase.replace(/\//g, '#');
    const [nameRaw, ...pathRaw] = name.split('#');
    const subPath = pathRaw.join('/');
    const moduleRaw = `${isNamespaced ? nameBase : nameRaw}@${version}`;
    const module = `${name}@${version}`;

    return new Promise(async (resolve, rejectRaw) => {
        if (stubbed.includes(nameBase)) return resolve('self.__acquire__ = {};');
        const reject = (e) => {
            // strip fullpath
            e.message = e.message
                .replace(new RegExp(path.resolve(__dirname + '/../..'), 'g'), '')
                .replace(/(\n|\r).*/g, '');
            rejectRaw(e);
        };
        try {
            // create cache dir if it doesn't exist
            if (!await existsAsync(moduleDir)) {
                await mkdirAsync(moduleDir);
            }
            if (!npmView) {
                return reject(new Error('acquire: npm not loaded'));
            } else if (version == 'newest') {
                // check latest on npm and see if we have it
                const info = await npmView([nameRaw], true);
                const latest = Object.keys(info)[0];
                const filename = path.resolve(moduleDir, `${name}@${latest}.js`);
                if (await existsAsync(filename)) {
                    return resolve(
                        (await readFileAsync(filename))
                    );
                }
            } else if (version == 'latest') {
                // grab the newest version from the cache
                const cacheList = (await readdirAsync(moduleDir))
                    .filter(fn => fn.startsWith(`${name}@`))
                    .sort((a, b) => {
                        const aVer = a.replace(/^.*@|\.js$/g, '');
                        const bVer = b.replace(/^.*@|\.js$/g, '');
                        if (!semver.valid(aVer) || !semver.valid(bVer)) {
                            return -1;
                        }
                        return semver.lt(aVer, bVer);
                    });
                if (typeof cacheList[0] == 'string') {
                    const filename = path.resolve(moduleDir, cacheList[0]);
                    if (await existsAsync(filename)) {
                        return resolve(
                            (await readFileAsync(filename))
                        );
                    }
                }
            } else {
                // check if we have the specific version
                const filename = path.resolve(moduleDir, module + '.js');
                if (await existsAsync(filename)) {
                    return resolve(
                        (await readFileAsync(filename))
                    );
                }
            }

            // install a freshy
            const result = await npmInstall(moduleDir, [moduleRaw]);
            const resultVersion = result[0][0].replace(/^.+?@/,'');
            const bundlename = `${name}@${resultVersion}.js`;
            const modulePath = path.resolve(moduleDir, 'node_modules', nameRaw);
            const packageSubPath = isNamespaced ? subPath : '';
            const packagePath = path.resolve(
                modulePath,
                packageSubPath,
                'package.json',
            );
            if (!await existsAsync(packagePath)) {
                return reject(new Error(`package.json not found`));
            }
            const pkg = await readFileAsync(packagePath);
            const pkgJson = JSON.parse(pkg.toString());
            const entrypoint = pkgJson.main || 'index.js';
            const rootScript = require.resolve(
                modulePath + (subPath.length ? '/' + subPath : '/' + entrypoint),
            );
            if (!await existsAsync(rootScript)) {
                return reject(new Error(`missing entrypoint file`));
            }

            // attempt to bundle module
            webpack({
                target: 'webworker',
                entry: rootScript,
                output: {
                    path: path.resolve(moduleDir),
                    filename: bundlename,
                    libraryTarget: 'umd',
                    library: '__acquire__',
                },
                mode: 'development',
                resolve: {
                    modules: [moduleDir, 'node_modules'],
                },
                node: {
                    fs: 'empty',
                    net: 'empty',
                    child_process: 'empty',
                    path: 'empty',
                    tls: 'empty',
                },
            }).run(async (err, ...args) => {
                if (err) {
                    reject(err);
                } else try {
                    const filename = path.resolve(moduleDir, bundlename);
                    if (!await existsAsync(filename)) {
                        reject(new Error(`${bundlename} not found`));
                    } else {
                        resolve(
                            (await readFileAsync(filename))
                        );
                    }
                } catch (e) {
                    reject(e);
                }
            });
        }
        catch (e) {
            reject(e);
        }
    });
};

module.exports = { acquire };
