const ivm = require('isolated-vm');

const fs = require('fs');
const { ping } = require('./spawn');
const fetch = require('node-fetch');
const FormData = require('form-data');
const colors = require('./scripts/colors');
const { acquire } = require('./acquire');
const { sudo, auth } = require('./access');
const { createNodeSend } = require('./scripts/print');

const { loadScripts, loadLazy }  = require('./load-scripts');
const { version } = require('../../package.json');

const scripts = loadScripts();

// vm.js
// events.js

function vm({ node, config, timeout = 30000 }) {
    const isolate = new ivm.Isolate({ memoryLimit: 128 });
    const context = await isolate.createContext();
    const ctx = context.global;

    function dispose() {
        if (!isolate.isDisposed) {
            isolate.dispose();
            context.release();
        }
    }

    function setMessage() {
        // config.IRC.nick
    }

    function setConfig() {
        ctx.setSync('config', new ivm.ExternalCopy(config).copyInto());
    }

    setConfig(config);

    ctx.setSync('global', jail.derefInto());

    jail.setSync('_ivm', ivm);
    jail.setSync('_sendRaw', new ivm.Reference(node.sendRaw));

        jail.setSync('_resetBuffer', new ivm.Reference(node.resetBuffer));

        jail.setSync('_whois', new ivm.Reference((text) => (
            text && new Promise((resolve, reject) => {
                node.client.whois(text, (data) => {
                    try {
                        resolve(new ivm.ExternalCopy(data).copyInto());
                    } catch(e) {
                        reject(new Error(e.message));
                    }
                });
            })
        )));
        jail.setSync('_ping', new ivm.Reference(ping));
        jail.setSync('_wordList', new ivm.Reference(() => (
            new Promise((resolve, reject) => {
                const path = '/usr/share/dict/words';
                fs.exists(path, (exists) => {
                    if (exists) {
                        fs.readFile(path, 'utf8', (err, data) => {
                            if (err) reject(err);
                            else resolve(new ivm.ExternalCopy(data).copyInto());
                        });
                    } else {
                        reject(new Error(`no such file: ${path}`));
                    }
                });
            })
        )));

        jail.setSync('_fetchSync', new ivm.Reference((url, type, config = {}) => (
            new Promise((resolve, reject) => {
                if (config.form) {
                    const form = new FormData();
                    Object.entries(config.form)
                        .forEach(([k, v]) => form.append(k, v));
                    config.body = form;
                    if (!('method' in config)) {
                        config.method = 'POST';
                    }
                }
                fetch(url, config)
                    .then((res) => res[type || 'text']())
                    .then(obj => resolve(new ivm.ExternalCopy(obj).copyInto()))
                    .catch(reject);
            })
        )));

        jail.setSync('_require', new ivm.Reference((str) => (
            new Promise((resolve, reject) => {
                acquire(str)
                    .then(obj => { resolve(obj.toString()) })
                    .catch(reject);
            })
        )));
        jail.setSync('_sleep', new ivm.Reference((ms) => (
            new Promise((resolve) => {
                setTimeout(resolve, Math.min(ms, maxTimeout));
            })
        )));

        jail.setSync('_auth', new ivm.Reference((from, isSudo) => (
            new Promise((resolve, reject) => {
                (isSudo ? sudo : auth)({
                    node,
                    from,
                    callback: (err) => err ? reject(err) : resolve(),
                });
            })
        )));

        jail.setSync('_sudoProxy', new ivm.Reference((config) => {
            if (config === 'exit') {
                process.kill(process.pid, 'SIGINT');
            }
            const { key, value, path } = config;
            const leaf = path.pop();
            const parent = path.reduce((a, c) => {
                if (!a[c]) {
                    a[c] = {};
                }
                return a[c];
            }, node);
            if (key == 'get') {
                return new ivm.ExternalCopy(parent[leaf]).copyInto()
            } else if (key == 'set') {
                parent[leaf] = value[0];
            } else if (key == 'call') {
                if (typeof parent[leaf] == 'function') {
                    return parent[leaf](...value);
                } else {
                    throw new Error('not a function');
                }
            }
        }));

        await (await isolate.compileScript(`
            global.scripts = {};
            ${scripts.map(([name, script]) => `
                (function() {
                    const exports = {};
                    const module = { exports: {} };
                    ${script};
                    global.scripts[${JSON.stringify(name)}] = module.exports;
                })();
            `).join('')}
         `)).run(context);

    // events use compileScript

    return {
        dispose,
        setConfig,
        setMessage,
    };
}
