// this probably looks dangerous, but since we only ever end up passing a string to be evaluated, it is as safe as allowing any other arbitrary code to run

const npm = require('npm');
const path = require('path');
const esbuild = require('esbuild');
const pkgname = require('parse-package-name');
const { promisify } = require('util');

const fs = require('fs');

const readFileAsync = promisify(fs.readFile);
const existsAsync = promisify(fs.exists);

const moduleDir = __dirname + '/../../cache/acquire';
const stubbed = require('module').builtinModules.filter(
    (mod) => !['buffer', 'events', 'util'].includes(mod),
);
const mocks = {
    events: path.resolve(moduleDir, 'node_modules/events/events.js'),
    buffer: path.resolve(moduleDir, 'node_modules/buffer/index.js'),
    util: path.resolve(moduleDir, 'node_modules/util/util.js'),
};

// load npm
let npmInstall;
const install = async ({ name, path, version }) => {
    // if we reloaded this file, we need to reload npm
    if (!npmInstall) await new Promise(loadAcquire);
    return await npmInstall([`${name}@${version || 'latest'}`]);
};

const loadAcquire = callback => npm.load(async (err) => {
    if (err) {
        console.error(err);
    } else {
        npmInstall = promisify(npm.commands.install);
        // disable an attack vector
        npm.config.set('ignore-scripts', true);
        // set install dir
        npm.prefix = moduleDir;
        // preinstall mocks
        for (const [name, path] of Object.entries(mocks)) {
            if (!(await existsAsync(path)))  {
                console.log(`require(): installing ${name} mock`)
                await acquire(name);
                console.log(`require(): ${name} installed`)
            }
        }
        callback();
    }
});

const pkgFilename = ({ name, path, version }) => {
    return `${name}#${path}@${version.replace('latest', '')}.js`;
};

async function acquire(input) {
    try {
        return await acquirePackage(input);
    } catch (e) {
        e.message = e.message.replaceAll(process.cwd(), '');
        throw e;
    }
}

async function acquirePackage(input) {
    const pkg = (() => {
        try {
            return pkgname(input);
        } catch {}
    })();
    if (!pkg) throw new Error(`invalid package name ${input}`);

    const bundlePath = path.resolve(moduleDir, pkgFilename(pkg));

    if (pkg.version !== 'latest' && (await existsAsync(bundlePath))) {
        return await readFileAsync(bundlePath);
    }

    await install(pkg);

    const modulePath = path.resolve(moduleDir, 'node_modules', pkg.name);
    const script = require.resolve(
        modulePath + (pkg.path ? '/' + pkg.path : ''),
    );
    if (!(await existsAsync(script)))
        throw new Error(`missing entrypoint file`);

    await esbuild.build({
        entryPoints: [script],
        bundle: true,
        platform: 'browser',
        format: 'cjs',
        outfile: bundlePath,
        minify: true,
        plugins: [
            {
                name: 'stub-externals',
                setup(build) {
                    const mockKeys = Object.keys(mocks);
                    build.onResolve({ filter: /[\S\s]*/ }, (args) => {
                        if (mockKeys.includes(args.path)) {
                            return { path: mocks[args.path] };
                        }
                        if (stubbed.includes(args.path)) {
                            return {
                                path: path.resolve(__dirname, 'stubs/blank.js'),
                            };
                        }
                        try {
                            require.resolve(args.path, {
                                paths: [args.resolveDir, modulePath, moduleDir],
                            });
                        } catch {
                            return { external: true };
                        }
                    });
                },
            },
            {
                name: 'jsdom-patch',
                setup(build) {
                    build.onLoad(
                        {
                            filter: /light-jsdom\/lib\/jsdom\/browser\/Window\.js$/,
                        },
                        async (args) => {
                            const contents = await fs.promises.readFile(
                                args.path,
                                'utf8',
                            );
                            return {
                                contents: contents.replace(
                                    /process.nextTick/g,
                                    `(args => args())`,
                                ),
                                loader: 'js',
                            };
                        },
                    );
                },
            },
        ],
    });

    return await readFileAsync(bundlePath);
}

module.exports = { acquire, loadAcquire };
