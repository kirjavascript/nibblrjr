// this probably looks dangerous, but since we only ever end up passing a string to be evaluated, it is as safe as allowing any other arbitrary code to run

const npm = require('global-npm');
const path = require('path');
const esbuild = require('esbuild');
const pkgname = require('parse-package-name');
const { promisify } = require('util');

const fs = require('fs');

const readFileAsync = promisify(fs.readFile);
const existsAsync = promisify(fs.exists);
const mkdirAsync = promisify(fs.mkdir);

const moduleDir = __dirname + '/../../cache/acquire';
const stubbed = require('module').builtinModules
    .filter(mod => !['buffer', 'events', 'util'].includes(mod));

// load npm
let npmInstall;
npm.load((err) => {
    if (err) {
        console.error(err);
    } else {
        npmInstall = promisify(npm.commands.install);
        // disable an attack vector
        npm.config.set('ignore-scripts', true);
        // set install dir
        npm.prefix = moduleDir;
    }
});

const install = async ({ name, path, version }) => {
    return await npmInstall([`${name}@${version || 'latest'}`]);
};

const pkgFilename = ({ name, path, version }) => {
    return `${name}#${path}@${version.replace('latest', '')}.js`;
};

async function acquire(input) {
    if (!(await existsAsync(moduleDir))) await mkdirAsync(moduleDir);

    const pkg = (() => {
        try {
            return pkgname(input);
        } catch {}
    })();
    if (!pkg) throw new Error(`invalid package name ${input}`);

    const bundlePath = path.resolve(moduleDir, pkgFilename(pkg));

    if (pkg.version !== 'latest' && await existsAsync(bundlePath)) {
        return await readFileAsync(bundlePath);
    }

    await install(pkg);

    const modulePath = path.resolve(moduleDir, 'node_modules', pkg.name);
    const script = require.resolve(
        modulePath + (pkg.path ? '/' + pkg.path : ''),
    );
    if (!(await existsAsync(script))) throw new Error(`missing entrypoint file`);

    await esbuild.build({
        entryPoints: [script],
        bundle: true,
        platform: 'node',
        format: 'cjs',
        outfile: bundlePath,
        minify: true,
        plugins: [
            {
                name: 'stub-externals',
                setup(build) {
                    build.onResolve({ filter: /[\S\s]*/ }, (args) => {
                        if (stubbed.includes(args.path)) {
                            return { path: path.resolve(__dirname, 'stubs/blank.js') };
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
                    build.onLoad({ filter: /light-jsdom\/lib\/api\.js$/ }, async (args) => {
                        const contents = await fs.promises.readFile(args.path, 'utf8');
                        return { contents: contents.replace(/"use strict";/g, `"use strict";
                            global.Buffer = require('buffer').Buffer;`), loader: 'js' };
                    });
                    build.onLoad({ filter: /light-jsdom\/lib\/jsdom\/browser\/Window\.js$/ }, async (args) => {
                        const contents = await fs.promises.readFile(args.path, 'utf8');
                        return { contents: contents.replace(/process/, `({nextTick: args => args()})`), loader: 'js' };
                    });
                },
            },
        ],
    });

    return await readFileAsync(bundlePath);
}

module.exports = { acquire };
